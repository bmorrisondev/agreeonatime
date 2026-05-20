// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

import { authComponent } from './auth';
import { deleteEventAndDependents } from './eventDeletion';
import { assertCanCreateActiveEvent } from './subscriptionLimits';
import { ensureAppUserIdForAuthUser, betterAuthUserIdString } from './users';

function randomShareTokenHex(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function uniqueShareToken(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const shareToken = randomShareTokenHex();
    const clash = await ctx.db
      .query('events')
      .withIndex('by_share_token', (q) => q.eq('shareToken', shareToken))
      .unique();
    if (!clash) {
      return shareToken;
    }
  }
  throw new ConvexError('Could not allocate a unique share link');
}

async function voteTotalsForEvent(ctx: QueryCtx, eventId: Id<'events'>): Promise<{ yes: number; no: number }> {
  const votes = await ctx.db
    .query('votes')
    .withIndex('by_event', (q) => q.eq('eventId', eventId))
    .collect();
  let yes = 0;
  let no = 0;
  for (const row of votes) {
    if (row.vote === 'yes') {
      yes += 1;
    } else {
      no += 1;
    }
  }
  return { yes, no };
}

/**
 * Owner home: grouped events with vote totals and decided slot time (DEV-386).
 * `refreshNonce` is ignored but lets the client force a resubscribe for pull-to-refresh UX.
 */
export const listForHome = query({
  args: { refreshNonce: v.optional(v.number()) },
  handler: async (ctx, _args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const authId = betterAuthUserIdString(authUser);
    if (authId == null) {
      return { groups: [] as { title: string; events: HomeEventDoc[] }[] };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authId))
      .unique();
    if (!user) {
      return { groups: [] as { title: string; events: HomeEventDoc[] }[] };
    }

    const owned = await ctx.db
      .query('events')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .collect();

    const enriched: HomeEventDoc[] = [];
    for (const event of owned) {
      const timeslots = await ctx.db
        .query('timeslots')
        .withIndex('by_event', (q) => q.eq('eventId', event._id))
        .collect();
      const { yes, no } = await voteTotalsForEvent(ctx, event._id);
      let decidedStartTime: number | undefined;
      if (event.decidedTimeslotId != null) {
        const slot = await ctx.db.get(event.decidedTimeslotId);
        decidedStartTime = slot?.startTime;
      }
      enriched.push({
        _id: event._id,
        title: event.title,
        status: event.status,
        deadline: event.deadline,
        createdAt: event.createdAt,
        timeslotCount: timeslots.length,
        yesVotes: yes,
        noVotes: no,
        decidedStartTime,
      });
    }

    const nowMs = Date.now();
    const isFutureDecided = (e: HomeEventDoc): boolean =>
      e.status === 'decided' && e.decidedStartTime != null && e.decidedStartTime > nowMs;

    const active = enriched
      .filter((e) => e.status === 'open' || isFutureDecided(e))
      .sort((a, b) => {
        const aSort = a.status === 'open' ? a.deadline : (a.decidedStartTime ?? a.deadline);
        const bSort = b.status === 'open' ? b.deadline : (b.decidedStartTime ?? b.deadline);
        return aSort - bSort;
      });
    const decided = enriched
      .filter((e) => e.status === 'decided' && !isFutureDecided(e))
      .sort((a, b) => b.createdAt - a.createdAt);
    const archived = enriched
      .filter((e) => e.status === 'closed')
      .sort((a, b) => b.createdAt - a.createdAt);

    const groups: { title: string; events: HomeEventDoc[] }[] = [];
    if (active.length > 0) {
      groups.push({ title: 'Active', events: active });
    }
    if (decided.length > 0) {
      groups.push({ title: 'Decided', events: decided });
    }
    if (archived.length > 0) {
      groups.push({ title: 'Archived', events: archived });
    }

    return { groups };
  },
});

/** Row shape returned to the client (plain JSON). */
type HomeEventDoc = {
  _id: Id<'events'>;
  title: string;
  status: 'open' | 'closed' | 'decided';
  deadline: number;
  createdAt: number;
  timeslotCount: number;
  yesVotes: number;
  noVotes: number;
  decidedStartTime?: number;
};

/** Owner create flow (DEV-385): validates, inserts event + approved owner timeslots, random `shareToken`. */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    /** Proposed slot start instants (ms since epoch), in submission order. */
    timeslotStarts: v.array(v.number()),
    deadline: v.number(),
    allowInviteeProposals: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<'events'>> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to create an event');
    }
    const userId = await ensureAppUserIdForAuthUser(ctx, authUser);
    await assertCanCreateActiveEvent(ctx, userId);

    const title = args.title.trim();
    if (title.length === 0) {
      throw new ConvexError('Title is required');
    }

    const starts = args.timeslotStarts;
    if (starts.length < 2 || starts.length > 20) {
      throw new ConvexError('Add between 2 and 20 proposed times');
    }

    const now = Date.now();
    if (args.deadline <= now) {
      throw new ConvexError('Voting deadline must be in the future');
    }
    const latestSlot = Math.max(...starts);
    if (args.deadline >= latestSlot) {
      throw new ConvexError('Voting deadline must be before the latest proposed time');
    }

    const descRaw = args.description?.trim();
    const description = descRaw != null && descRaw.length > 0 ? descRaw : undefined;

    const shareToken = await uniqueShareToken(ctx);
    const createdAt = now;
    const eventId = await ctx.db.insert('events', {
      ownerId: userId,
      title,
      description,
      status: 'open',
      deadline: args.deadline,
      allowInviteeProposals: args.allowInviteeProposals,
      createdAt,
      shareToken,
    });

    for (const startTime of starts) {
      await ctx.db.insert('timeslots', {
        eventId,
        startTime,
        proposedBy: userId,
        approvalStatus: 'approved',
        createdAt,
      });
    }

    return eventId;
  },
});

function voterKey(v: {
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

export const getForOwner = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, { eventId }) => {
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
    const event = await ctx.db.get(eventId);
    if (!event || event.ownerId !== user._id) {
      return null;
    }
    let decidedStartTime: number | undefined;
    if (event.decidedTimeslotId != null) {
      const slot = await ctx.db.get(event.decidedTimeslotId);
      decidedStartTime = slot?.startTime;
    }

    const allVotes = await ctx.db
      .query('votes')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .collect();

    const votesByTimeslot = new Map<string, typeof allVotes>();
    for (const row of allVotes) {
      const key = row.timeslotId;
      const bucket = votesByTimeslot.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        votesByTimeslot.set(key, [row]);
      }
    }

    const voterKeys = new Set<string>();
    for (const row of allVotes) {
      voterKeys.add(voterKey(row));
    }

    const timeslots = await ctx.db
      .query('timeslots')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .collect();
    timeslots.sort((a, b) => a.startTime - b.startTime);

    const approvedTimeslots = timeslots
      .filter((t) => t.approvalStatus === 'approved')
      .map((slot) => {
        const slotVotes = votesByTimeslot.get(slot._id) ?? [];
        let yesCount = 0;
        let noCount = 0;
        for (const v of slotVotes) {
          if (v.vote === 'yes') {
            yesCount += 1;
          } else {
            noCount += 1;
          }
        }
        const votes = slotVotes.map((v) => ({
          voterName: v.voterName,
          vote: v.vote as 'yes' | 'no',
          voterKey: voterKey(v),
        }));
        return {
          _id: slot._id,
          startTime: slot.startTime,
          yesCount,
          noCount,
          votes,
        };
      });

    const pendingTimeslots = timeslots
      .filter((t) => t.approvalStatus === 'pending')
      .map((slot) => ({
        _id: slot._id,
        startTime: slot.startTime,
        createdAt: slot.createdAt,
        proposedByGuestName: slot.proposedByGuestName,
      }));

    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      status: event.status,
      deadline: event.deadline,
      shareToken: event.shareToken,
      allowInviteeProposals: event.allowInviteeProposals,
      createdAt: event.createdAt,
      decidedTimeslotId: event.decidedTimeslotId,
      decidedStartTime,
      distinctVoterCount: voterKeys.size,
      approvedTimeslots,
      pendingTimeslots,
    };
  },
});

/** Owner permanently deletes an event and all votes/timeslots (DEV-445). */
export const deleteForOwner = mutation({
  args: { eventId: v.id('events') },
  handler: async (ctx, { eventId }): Promise<void> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to delete an event');
    }
    const userId = await ensureAppUserIdForAuthUser(ctx, authUser);

    const event = await ctx.db.get(eventId);
    if (!event || event.ownerId !== userId) {
      throw new ConvexError('Event not found or you are not the owner');
    }

    await deleteEventAndDependents(ctx, eventId);
  },
});

/** Owner approves or rejects an invitee-proposed timeslot (DEV-387). */
export const resolvePendingTimeslot = mutation({
  args: {
    eventId: v.id('events'),
    timeslotId: v.id('timeslots'),
    decision: v.union(v.literal('approve'), v.literal('reject')),
  },
  handler: async (ctx, args): Promise<void> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to manage proposals');
    }
    const userId = await ensureAppUserIdForAuthUser(ctx, authUser);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.ownerId !== userId) {
      throw new ConvexError('Event not found or you are not the owner');
    }

    const slot = await ctx.db.get(args.timeslotId);
    if (!slot || slot.eventId !== args.eventId) {
      throw new ConvexError('Timeslot not found');
    }
    if (slot.approvalStatus !== 'pending') {
      throw new ConvexError('This proposal is not pending');
    }

    const nextStatus = args.decision === 'approve' ? 'approved' : 'rejected';
    await ctx.db.patch(args.timeslotId, { approvalStatus: nextStatus });
  },
});

/**
 * Owner finalizes the event time (DEV-388). Sets `decided` and schedules optional owner email (DEV-391).
 */
export const finalizeEventTime = mutation({
  args: {
    eventId: v.id('events'),
    timeslotId: v.id('timeslots'),
  },
  handler: async (ctx, args): Promise<void> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to pick a time');
    }
    const userId = await ensureAppUserIdForAuthUser(ctx, authUser);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.ownerId !== userId) {
      throw new ConvexError('Event not found or you are not the owner');
    }
    if (event.status !== 'open') {
      throw new ConvexError('This event is already finalized');
    }

    const slot = await ctx.db.get(args.timeslotId);
    if (!slot || slot.eventId !== args.eventId) {
      throw new ConvexError('Time not found');
    }
    if (slot.approvalStatus !== 'approved') {
      throw new ConvexError('You can only pick from approved times');
    }

    await ctx.db.patch(args.eventId, {
      status: 'decided',
      decidedTimeslotId: args.timeslotId,
    });

    const owner = await ctx.db.get(userId);
    const ownerEmail = owner?.email ?? '';
    if (ownerEmail.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notifications.ownerDecidedEmail, {
        ownerEmail,
        eventTitle: event.title,
        startTime: slot.startTime,
      });
    }
  },
});

/** Cast a vote on an approved timeslot (DEV-391). */
export const castVote = mutation({
  args: {
    eventId: v.id('events'),
    timeslotId: v.id('timeslots'),
    voterName: v.string(),
    voterSessionId: v.optional(v.string()),
    vote: v.union(v.literal('yes'), v.literal('no')),
  },
  handler: async (ctx, args): Promise<Id<'votes'>> => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== 'open') {
      throw new ConvexError('Event not found or voting is closed');
    }
    if (event.deadline < Date.now()) {
      throw new ConvexError('Voting deadline has passed');
    }

    const slot = await ctx.db.get(args.timeslotId);
    if (!slot || slot.eventId !== args.eventId || slot.approvalStatus !== 'approved') {
      throw new ConvexError('Timeslot not available for voting');
    }

    let voterUserId: Id<'users'> | undefined;
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (authUser) {
      voterUserId = await ensureAppUserIdForAuthUser(ctx, authUser);
    }

    const existingVotes = await ctx.db
      .query('votes')
      .withIndex('by_timeslot', (q) => q.eq('timeslotId', args.timeslotId))
      .collect();

    const newKey = voterKey({
      voterName: args.voterName,
      voterUserId,
      voterSessionId: args.voterSessionId,
    });
    const duplicate = existingVotes.find((v) => voterKey(v) === newKey);
    if (duplicate) {
      await ctx.db.patch(duplicate._id, { vote: args.vote });
      return duplicate._id;
    }

    const voteId = await ctx.db.insert('votes', {
      eventId: args.eventId,
      timeslotId: args.timeslotId,
      voterName: args.voterName,
      voterUserId,
      voterSessionId: args.voterSessionId,
      vote: args.vote,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.notifications.notifyOwnerOfVote, {
      eventId: args.eventId,
      voterName: args.voterName,
      timeslotStart: slot.startTime,
      vote: args.vote,
    });

    return voteId;
  },
});

/** Invitee proposes a new timeslot (requires event.allowInviteeProposals, DEV-391). */
export const proposeTimeslot = mutation({
  args: {
    eventId: v.id('events'),
    startTime: v.number(),
  },
  handler: async (ctx, args): Promise<Id<'timeslots'>> => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== 'open') {
      throw new ConvexError('Event not found or not open');
    }
    if (!event.allowInviteeProposals) {
      throw new ConvexError('This event does not accept new time proposals');
    }
    if (args.startTime <= Date.now()) {
      throw new ConvexError('Proposed time must be in the future');
    }

    let proposedBy: Id<'users'> | undefined;
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (authUser) {
      proposedBy = await ensureAppUserIdForAuthUser(ctx, authUser);
    }

    const slotId = await ctx.db.insert('timeslots', {
      eventId: args.eventId,
      startTime: args.startTime,
      proposedBy,
      approvalStatus: 'pending',
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.notifications.notifyOwnerOfProposal, {
      eventId: args.eventId,
      timeslotStart: args.startTime,
    });

    return slotId;
  },
});
