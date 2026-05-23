// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { userHasDevProOverride } from './devProOverride';

/** RevenueCat entitlement identifier — must match the dashboard. */
export const PRO_ENTITLEMENT_ID = 'pro';

/** Product ids that should grant Pro (keep in sync with `lib/purchases/constants.ts`). */
export const PRO_PRODUCT_IDS = [
  'agreeonatime_pro_monthly_399',
  'agreeonatime_pro_monthly',
  'me.brianmm.agreeonatime.pro.monthly',
  'agreeonatime_pro_annual_3999',
  'me.brianmm.agreeonatime.pro.annual',
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

/** Free tier: max unique voters per event. */
export const FREE_MAX_VOTERS_PER_EVENT = 8;

/** Free tier: full vote history visible for this many days after event creation. */
export const FREE_HISTORY_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

export type SubscriptionLimitErrorCode = 'TooManyActiveEvents' | 'EventAtCapacity';

interface SubscriptionLimitErrorPayload {
  code: SubscriptionLimitErrorCode;
  message: string;
}

export function subscriptionLimitError(
  code: SubscriptionLimitErrorCode,
  message: string,
): ConvexError {
  return new ConvexError({ code, message } satisfies SubscriptionLimitErrorPayload);
}

export function userHasPro(
  user: Pick<Doc<'users'>, 'proExpiresAt' | 'devProOverride'>,
  nowMs: number = Date.now(),
): boolean {
  if (user.proExpiresAt != null && user.proExpiresAt > nowMs) {
    return true;
  }
  return userHasDevProOverride(user);
}

export function voterKey(v: {
  voterName: string;
  voterUserId?: Id<'users'>;
  voterSessionId?: string;
}): string {
  if (v.voterUserId != null) {
    return `u:${v.voterUserId}`;
  }
  if (v.voterSessionId != null && v.voterSessionId.length > 0) {
    return `s:${v.voterSessionId}`;
  }
  return `n:${v.voterName}`;
}

/** Whether vote results should be hidden for a free owner (30-day history cap). */
export function isHistoryLocked(
  user: Pick<Doc<'users'>, 'proExpiresAt'>,
  eventCreatedAt: number,
  nowMs: number = Date.now(),
): boolean {
  if (userHasPro(user)) {
    return false;
  }
  return nowMs - eventCreatedAt > FREE_HISTORY_VISIBLE_MS;
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

export async function countDistinctVotersForEvent(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<'events'>,
): Promise<number> {
  const votes = await ctx.db
    .query('votes')
    .withIndex('by_event', (q) => q.eq('eventId', eventId))
    .collect();
  const keys = new Set<string>();
  for (const row of votes) {
    keys.add(voterKey(row));
  }
  return keys.size;
}

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
    throw subscriptionLimitError(
      'TooManyActiveEvents',
      'Free accounts can have up to three active events at a time. Subscribe for unlimited events.',
    );
  }
}

/**
 * Throws when a free event already has the maximum number of unique voters and this is a new voter.
 */
/** Agree+ only: availability grid / range scheduling (DEV-434). */
export async function assertCanUseAvailabilityGrid(
  ctx: MutationCtx,
  ownerId: Id<'users'>,
): Promise<void> {
  const user = await ctx.db.get(ownerId);
  if (user == null) {
    throw new ConvexError('Account not found — try signing in again.');
  }
  if (!userHasPro(user)) {
    throw new ConvexError('Availability windows are an Agree+ feature. Subscribe to create range events.');
  }
}

export async function assertCanAcceptNewVoter(
  ctx: MutationCtx,
  event: Pick<Doc<'events'>, '_id' | 'ownerId'>,
  newVoterKey: string,
): Promise<void> {
  const owner = await ctx.db.get(event.ownerId);
  if (owner == null) {
    throw new ConvexError('Event not found');
  }
  if (userHasPro(owner)) {
    return;
  }

  const votes = await ctx.db
    .query('votes')
    .withIndex('by_event', (q) => q.eq('eventId', event._id))
    .collect();

  const keys = new Set<string>();
  for (const row of votes) {
    keys.add(voterKey(row));
  }
  if (keys.has(newVoterKey)) {
    return;
  }
  if (keys.size >= FREE_MAX_VOTERS_PER_EVENT) {
    throw subscriptionLimitError(
      'EventAtCapacity',
      'This event has reached its voting limit. The organizer can upgrade to allow more responses.',
    );
  }
}
