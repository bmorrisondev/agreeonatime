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

/** Free tier: at most one event with `status === 'open'`. */
export const FREE_MAX_ACTIVE_OPEN_EVENTS = 1;

export function userHasPro(user: Pick<Doc<'users'>, 'proExpiresAt'>, nowMs: number = Date.now()): boolean {
  return user.proExpiresAt != null && user.proExpiresAt > nowMs;
}

export async function countOpenEventsForOwner(
  ctx: QueryCtx | MutationCtx,
  ownerId: Id<'users'>,
): Promise<number> {
  const owned = await ctx.db
    .query('events')
    .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
    .collect();
  return owned.filter((e) => e.status === 'open').length;
}

/**
 * Throws when a non‑Pro user already has the maximum number of open (active) events.
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
  const openCount = await countOpenEventsForOwner(ctx, ownerId);
  if (openCount >= FREE_MAX_ACTIVE_OPEN_EVENTS) {
    throw new ConvexError(
      'Free accounts can have one active event at a time. Subscribe for unlimited events.',
    );
  }
}
