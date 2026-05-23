// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import {
  action,
  internalAction,
  internalMutation,
  query,
  type ActionCtx,
} from './_generated/server';

import { authComponent } from './auth';
import { isDevProOverrideDeploymentEnabled } from './devProOverride';
import {
  countActiveEventsForOwner,
  FREE_MAX_ACTIVE_OPEN_EVENTS,
  isProProductId,
  PRO_ENTITLEMENT_ID,
  userHasPro,
} from './subscriptionLimits';
import { betterAuthUserIdString } from './users';

type RevenueCatSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<
      string,
      {
        expires_date?: string | null;
        grace_period_expires_date?: string | null;
      }
    >;
  };
  /** Some RevenueCat REST responses nest the payload under `value`. */
  value?: RevenueCatSubscriberResponse;
};

type RevenueCatWebhookEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  product_id?: string | null;
  expiration_at_ms?: number | null;
};

function proExpiresAtFromExpirationMs(expiresMs: number | null | undefined): number | null | undefined {
  if (expiresMs == null) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (expiresMs <= Date.now()) {
    return null;
  }
  return expiresMs;
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (iso == null || iso.length === 0) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function subscriberFromApiBody(body: RevenueCatSubscriberResponse): RevenueCatSubscriberResponse['subscriber'] {
  return body.subscriber ?? body.value?.subscriber;
}

/** Latest entitlement end (ms) from RevenueCat subscriber JSON, or null if inactive. */
export function proExpiresAtFromRevenueCatPayload(body: RevenueCatSubscriberResponse): number | null {
  const ent = subscriberFromApiBody(body)?.entitlements?.[PRO_ENTITLEMENT_ID];
  if (ent == null) {
    return null;
  }
  const grace = parseIsoMs(ent.grace_period_expires_date);
  const expires = parseIsoMs(ent.expires_date);
  const candidate = grace ?? expires;
  if (candidate == null) {
    // Lifetime / non-expiring entitlement
    return Number.MAX_SAFE_INTEGER;
  }
  if (candidate <= Date.now()) {
    return null;
  }
  return candidate;
}

/**
 * Derive Pro expiry from a webhook when possible.
 * Returns `undefined` when the webhook does not include entitlement info (fall back to REST).
 */
export function proExpiresAtFromWebhookEvent(
  event: RevenueCatWebhookEvent,
): number | null | undefined {
  if (event.type === 'EXPIRATION') {
    return null;
  }

  const entitlementIds = event.entitlement_ids;
  if (entitlementIds != null && entitlementIds.length > 0) {
    if (!entitlementIds.includes(PRO_ENTITLEMENT_ID)) {
      return null;
    }
    return proExpiresAtFromExpirationMs(event.expiration_at_ms) ?? null;
  }

  const singularEntitlement = event.entitlement_id?.trim();
  if (singularEntitlement === PRO_ENTITLEMENT_ID) {
    return proExpiresAtFromExpirationMs(event.expiration_at_ms) ?? null;
  }

  // Test Store often sends entitlement_ids: null even on active renewals — use product_id.
  if (isProProductId(event.product_id)) {
    const fromProduct = proExpiresAtFromExpirationMs(event.expiration_at_ms);
    if (fromProduct !== undefined) {
      return fromProduct;
    }
  }

  return undefined;
}

function authUserIdsFromWebhook(event: RevenueCatWebhookEvent): string[] {
  const ids = new Set<string>();
  const primary = event.app_user_id?.trim();
  if (primary != null && primary.length > 0) {
    ids.add(primary);
  }
  const original = event.original_app_user_id?.trim();
  if (original != null && original.length > 0) {
    ids.add(original);
  }
  for (const alias of event.aliases ?? []) {
    const trimmed = alias.trim();
    if (trimmed.length > 0) {
      ids.add(trimmed);
    }
  }
  return [...ids];
}

async function fetchProExpiresAtForAuthUser(authUserId: string): Promise<number | null> {
  const secret =
    process.env.REVENUECAT_SECRET_API_KEY?.trim() ??
    process.env.REVENUECAT_API_V2_SECRET?.trim();
  if (secret == null || secret.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[subscriptions] REVENUECAT_SECRET_API_KEY not set — skipping RevenueCat API');
    }
    return null;
  }

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(authUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    console.error('[subscriptions] RevenueCat API error', res.status, text);
    throw new ConvexError('Could not verify subscription status. Try again in a moment.');
  }

  const body = (await res.json()) as RevenueCatSubscriberResponse;
  return proExpiresAtFromRevenueCatPayload(body);
}

/** Best active Pro expiry across RevenueCat app user ids (webhook aliases, anonymous, etc.). */
async function fetchProExpiresAtForCandidateIds(candidateIds: string[]): Promise<number | null> {
  let best: number | null = null;
  for (const id of candidateIds) {
    const trimmed = id.trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      const expiresAt = await fetchProExpiresAtForAuthUser(trimmed);
      if (expiresAt != null && (best == null || expiresAt > best)) {
        best = expiresAt;
      }
    } catch {
      // Try remaining ids (e.g. anonymous vs identified subscriber).
    }
  }
  return best;
}

export const applyProExpiresAt = internalMutation({
  args: {
    authUserId: v.string(),
    proExpiresAt: v.union(v.number(), v.null()),
    candidateAuthUserIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { authUserId, proExpiresAt, candidateAuthUserIds }) => {
    const idsToTry = new Set<string>([authUserId]);
    for (const id of candidateAuthUserIds ?? []) {
      if (id.length > 0) {
        idsToTry.add(id);
      }
    }

    let user = null;
    for (const id of idsToTry) {
      const match = await ctx.db
        .query('users')
        .withIndex('by_auth_user', (q) => q.eq('authUserId', id))
        .unique();
      if (match != null) {
        user = match;
        break;
      }
    }

    if (user == null) {
      console.warn('[subscriptions] applyProExpiresAt: no users row for RevenueCat ids', [
        ...idsToTry,
      ]);
      return;
    }

    await ctx.db.patch(user._id, { proExpiresAt: proExpiresAt ?? undefined });
  },
});

async function syncProForAuthUserId(
  ctx: ActionCtx,
  authUserId: string,
  webhookEvent?: RevenueCatWebhookEvent,
): Promise<void> {
  const candidateIds =
    webhookEvent != null ? authUserIdsFromWebhook(webhookEvent) : [authUserId];

  let proExpiresAt: number | null | undefined =
    webhookEvent != null ? proExpiresAtFromWebhookEvent(webhookEvent) : undefined;

  if (proExpiresAt === undefined) {
    proExpiresAt = await fetchProExpiresAtForCandidateIds(candidateIds);
  }

  const convexAuthUserId =
    candidateIds.find((id) => !id.startsWith('$RC')) ?? authUserId;

  await ctx.runMutation(internal.subscriptions.applyProExpiresAt, {
    authUserId: convexAuthUserId,
    proExpiresAt: proExpiresAt ?? null,
    candidateAuthUserIds: candidateIds,
  });
}

/** Pull subscription state from RevenueCat into Convex (call after purchase / on app open). */
export const syncFromRevenueCat = action({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to sync subscription');
    }
    const authId = betterAuthUserIdString(authUser);
    if (authId == null) {
      throw new ConvexError('Account id missing — try signing in again.');
    }
    await syncProForAuthUserId(ctx, authId);
  },
});

/** Create-flow gating: server entitlement + open event count. */
export const getCreateEligibility = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }
    const authId = betterAuthUserIdString(authUser);
    if (authId == null) {
      return null;
    }
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authId))
      .unique();
    if (!user) {
      return null;
    }

    const isPro = userHasPro(user);
    const activeOpenCount = await countActiveEventsForOwner(ctx, user._id);
    const canCreateMore =
      isPro || activeOpenCount < FREE_MAX_ACTIVE_OPEN_EVENTS;

    const devProOverrideAvailable = isDevProOverrideDeploymentEnabled();

    return {
      isPro,
      activeOpenCount,
      maxActiveEvents: isPro ? null : FREE_MAX_ACTIVE_OPEN_EVENTS,
      canCreateMore,
      devProOverrideAvailable,
      devProOverride: devProOverrideAvailable ? user.devProOverride === true : undefined,
    };
  },
});

export const syncFromRevenueCatInternal = internalAction({
  args: {
    authUserId: v.string(),
    webhookEvent: v.optional(
      v.object({
        type: v.optional(v.string()),
        app_user_id: v.optional(v.string()),
        original_app_user_id: v.optional(v.string()),
        aliases: v.optional(v.array(v.string())),
        entitlement_id: v.optional(v.union(v.string(), v.null())),
        entitlement_ids: v.optional(v.union(v.array(v.string()), v.null())),
        product_id: v.optional(v.union(v.string(), v.null())),
        expiration_at_ms: v.optional(v.union(v.number(), v.null())),
      }),
    ),
  },
  handler: async (ctx, { authUserId, webhookEvent }) => {
    await syncProForAuthUserId(ctx, authUserId, webhookEvent ?? undefined);
  },
});
