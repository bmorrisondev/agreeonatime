// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

/** RevenueCat entitlement identifier — must match the dashboard. */
export const PRO_ENTITLEMENT_ID = 'pro';

/** Product ids that should grant Pro (keep in sync with `lib/purchases/constants.ts`). */
export const PRO_PRODUCT_IDS = [
  'agreeonatime_pro_monthly_399',
  'agreeonatime_pro_monthly',
  'me.brianmm.agreeonatime.pro.monthly',
] as const;

const PRO_PRODUCT_ID_SET = new Set<string>(PRO_PRODUCT_IDS);

export function isProProductId(productId: string | undefined | null): boolean {
  if (productId == null || productId.length === 0) {
    return false;
  }
  return PRO_PRODUCT_ID_SET.has(productId);
}

/** Free tier: at most this many active events (open + future decided). */
export const FREE_MAX_ACTIVE_OPEN_EVENTS = 3;

export function userHasPro(user: Pick<Doc<'users'>, 'proExpiresAt'>, nowMs: number = Date.now()): boolean {
  return user.proExpiresAt != null && user.proExpiresAt > nowMs;
}

/** Open events and decided events whose start time is still in the future. */
export async function countActiveEventsForOwner(
  ctx: QueryCtx | MutationCtx,
  ownerId: Id<'users'>,
  nowMs: number = Date.now(),
): Promise<number> {
  const owned = await ctx.db
    .query('events')
    .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
    .collect();

  let count = 0;
  for (const event of owned) {
    if (event.status === 'open') {
      count += 1;
      continue;
    }
    if (event.status === 'decided' && event.decidedTimeslotId != null) {
      const slot = await ctx.db.get(event.decidedTimeslotId);
      if (slot != null && slot.startTime > nowMs) {
        count += 1;
      }
    }
  }
  return count;
}

/** @deprecated Use {@link countActiveEventsForOwner}. */
export const countOpenEventsForOwner = countActiveEventsForOwner;

/**
 * Throws when a non‑Pro user already has the maximum number of active events.
 */
export async function assertCanCreateActiveEvent(
  ctx: MutationCtx,
  ownerId: Id<'users'>,
): Promise<void> {
  const user = await ctx.db.get(ownerId);
  if (user == null) {
    throw new ConvexError('Account not found — try signing in again.');
  }
  if (userHasPro(user)) {
    return;
  }
  const activeCount = await countActiveEventsForOwner(ctx, ownerId);
  if (activeCount >= FREE_MAX_ACTIVE_OPEN_EVENTS) {
    throw new ConvexError(
      'Free accounts can have up to three active events at a time. Subscribe for unlimited events.',
    );
  }
}
