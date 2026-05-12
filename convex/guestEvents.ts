// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';

const MAX_NAME_LEN = 80;
const MIN_SESSION_LEN = 16;
const MAX_VOTE_CHANGES_PER_SESSION = 120;

async function eventByShareToken(ctx: MutationCtx, shareToken: string) {
  const token = shareToken.trim();
  if (token.length < 8) {
    throw new ConvexError('Invalid link');
  }
  const event = await ctx.db
    .query('events')
    .withIndex('by_share_token', (q) => q.eq('shareToken', token))
    .unique();
  if (!event) {
    throw new ConvexError('Event not found');
  }
  return event;
}

async function voteChangesForSession(
  ctx: MutationCtx,
  eventId: Id<'events'>,
  voterSessionId: string,
): Promise<number> {
  const votes = await ctx.db
    .query('votes')
    .withIndex('by_event', (q) => q.eq('eventId', eventId))
    .collect();
  let n = 0;
  for (const row of votes) {
    if (row.voterSessionId === voterSessionId) {
      n += 1;
    }
  }
  return n;
}

export const getByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, { shareToken }) => {
    const token = shareToken.trim();
    if (token.length < 8) {
      return null;
    }
    const event = await ctx.db
      .query('events')
      .withIndex('by_share_token', (q) => q.eq('shareToken', token))
      .unique();
    if (!event) {
      return null;
    }

    const timeslots = await ctx.db
      .query('timeslots')
      .withIndex('by_event', (q) => q.eq('eventId', event._id))
      .collect();
    timeslots.sort((a, b) => a.startTime - b.startTime);

    const approved = timeslots.filter((t) => t.approvalStatus === 'approved');
    const pending = timeslots.filter((t) => t.approvalStatus === 'pending');

    const slotsOut = [];
    for (const slot of approved) {
      const slotVotes = await ctx.db
        .query('votes')
        .withIndex('by_timeslot', (q) => q.eq('timeslotId', slot._id))
        .collect();
      let yes = 0;
      let no = 0;
      for (const v of slotVotes) {
        if (v.vote === 'yes') {
          yes += 1;
        } else {
          no += 1;
        }
      }
      slotsOut.push({
        _id: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        yesCount: yes,
        noCount: no,
      });
    }

    let decidedStartTime: number | undefined;
    if (event.decidedTimeslotId != null) {
      const decided = await ctx.db.get(event.decidedTimeslotId);
      decidedStartTime = decided?.startTime;
    }

    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      status: event.status,
      deadline: event.deadline,
      allowInviteeProposals: event.allowInviteeProposals,
      decidedTimeslotId: event.decidedTimeslotId,
      decidedStartTime,
      approvedTimeslots: slotsOut,
      pendingCount: pending.length,
    };
  },
});

export const setGuestVote = mutation({
  args: {
    shareToken: v.string(),
    voterSessionId: v.string(),
    voterName: v.string(),
    timeslotId: v.id('timeslots'),
    vote: v.union(v.literal('yes'), v.literal('no')),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = args.voterSessionId.trim();
    if (session.length < MIN_SESSION_LEN) {
      throw new ConvexError('Session invalid — refresh the page');
    }
    const name = args.voterName.trim();
    if (name.length === 0 || name.length > MAX_NAME_LEN) {
      throw new ConvexError('Enter your name');
    }

    const event = await eventByShareToken(ctx, args.shareToken);
    if (event.status !== 'open') {
      throw new ConvexError('Voting is closed for this event');
    }
    const now = Date.now();
    if (now > event.deadline) {
      throw new ConvexError('The voting deadline has passed');
    }

    const slot = await ctx.db.get(args.timeslotId);
    if (!slot || slot.eventId !== event._id) {
      throw new ConvexError('Time not found');
    }
    if (slot.approvalStatus !== 'approved') {
      throw new ConvexError('You can only vote on approved times');
    }

    const changes = await voteChangesForSession(ctx, event._id, session);
    if (changes >= MAX_VOTE_CHANGES_PER_SESSION) {
      throw new ConvexError('Too many updates — try again later');
    }

    const existing = await ctx.db
      .query('votes')
      .withIndex('by_timeslot', (q) => q.eq('timeslotId', args.timeslotId))
      .collect();
    const mine = existing.find((v) => v.voterSessionId === session);
    const createdAt = now;
    if (mine) {
      await ctx.db.patch(mine._id, {
        voterName: name,
        vote: args.vote,
        createdAt,
      });
    } else {
      await ctx.db.insert('votes', {
        eventId: event._id,
        timeslotId: args.timeslotId,
        voterName: name,
        voterSessionId: session,
        vote: args.vote,
        createdAt,
      });
    }
  },
});

export const proposeGuestTimeslot = mutation({
  args: {
    shareToken: v.string(),
    voterSessionId: v.string(),
    voterName: v.string(),
    startTime: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = args.voterSessionId.trim();
    if (session.length < MIN_SESSION_LEN) {
      throw new ConvexError('Session invalid — refresh the page');
    }
    const name = args.voterName.trim();
    if (name.length === 0 || name.length > MAX_NAME_LEN) {
      throw new ConvexError('Enter your name');
    }

    const event = await eventByShareToken(ctx, args.shareToken);
    if (event.status !== 'open') {
      throw new ConvexError('This event is no longer accepting proposals');
    }
    if (!event.allowInviteeProposals) {
      throw new ConvexError('The host has turned off new time proposals');
    }
    const now = Date.now();
    if (now > event.deadline) {
      throw new ConvexError('The voting deadline has passed');
    }
    if (args.startTime <= now) {
      throw new ConvexError('Pick a time in the future');
    }

    const slots = await ctx.db
      .query('timeslots')
      .withIndex('by_event', (q) => q.eq('eventId', event._id))
      .collect();
    if (slots.length >= 20) {
      throw new ConvexError('This event already has the maximum number of times');
    }

    await ctx.db.insert('timeslots', {
      eventId: event._id,
      startTime: args.startTime,
      proposedBy: undefined,
      proposedByGuestName: name,
      approvalStatus: 'pending',
      createdAt: now,
    });

    void session;
  },
});
