// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

import { authComponent } from './auth';

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

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUser.id))
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

    const active = enriched
      .filter((e) => e.status === 'open')
      .sort((a, b) => a.deadline - b.deadline);
    const decided = enriched
      .filter((e) => e.status === 'decided')
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
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUser.id))
      .unique();
    if (!user) {
      throw new ConvexError('Profile not ready — try again in a moment');
    }

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
      ownerId: user._id,
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
        proposedBy: user._id,
        approvalStatus: 'approved',
        createdAt,
      });
    }

    return eventId;
  },
});

export const getForOwner = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, { eventId }) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }
    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUser.id))
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
    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      status: event.status,
      deadline: event.deadline,
      shareToken: event.shareToken,
      decidedStartTime,
    };
  },
});
