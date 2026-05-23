import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

import { deleteAvailabilityForEvent } from './availabilityGrid';

const BATCH_SIZE = 256;

/** Removes all votes and timeslots for an event, then the event row (DEV-445). */
export async function deleteEventAndDependents(
  ctx: MutationCtx,
  eventId: Id<'events'>,
): Promise<void> {
  while (true) {
    const votes = await ctx.db
      .query('votes')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .take(BATCH_SIZE);
    if (votes.length === 0) {
      break;
    }
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }
  }

  await deleteAvailabilityForEvent(ctx, eventId);

  while (true) {
    const timeslots = await ctx.db
      .query('timeslots')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .take(BATCH_SIZE);
    if (timeslots.length === 0) {
      break;
    }
    for (const slot of timeslots) {
      await ctx.db.delete(slot._id);
    }
  }

  while (true) {
    const invitees = await ctx.db
      .query('eventInvitees')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .take(BATCH_SIZE);
    if (invitees.length === 0) {
      break;
    }
    for (const invitee of invitees) {
      await ctx.db.delete(invitee._id);
    }
  }

  while (true) {
    const unsubscribes = await ctx.db
      .query('emailUnsubscribes')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .take(BATCH_SIZE);
    if (unsubscribes.length === 0) {
      break;
    }
    for (const row of unsubscribes) {
      await ctx.db.delete(row._id);
    }
  }

  await ctx.db.delete(eventId);
}
