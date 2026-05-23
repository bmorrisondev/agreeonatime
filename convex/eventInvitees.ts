// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, type MutationCtx } from './_generated/server';

import { authComponent } from './auth';
import { voterKey } from './subscriptionLimits';
import { ensureAppUserIdForAuthUser } from './users';

const MAX_EMAIL_LEN = 320;
const MIN_SESSION_LEN = 16;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return email.length > 3 && email.includes('@') && email.length <= MAX_EMAIL_LEN;
}

async function upsertEventInvitee(
  ctx: MutationCtx,
  args: {
    eventId: Id<'events'>;
    email: string;
    name?: string;
    voterUserId?: Id<'users'>;
    voterSessionId?: string;
  },
): Promise<void> {
  const email = normalizeEmail(args.email);
  if (!isValidEmail(email)) {
    return;
  }

  const existing = await ctx.db
    .query('eventInvitees')
    .withIndex('by_event_and_email', (q) => q.eq('eventId', args.eventId).eq('email', email))
    .unique();

  const now = Date.now();
  if (existing != null) {
    const patch: {
      name?: string;
      voterUserId?: Id<'users'>;
      voterSessionId?: string;
    } = {};
    if (args.name != null && args.name.length > 0) {
      patch.name = args.name;
    }
    if (args.voterUserId != null) {
      patch.voterUserId = args.voterUserId;
    }
    if (args.voterSessionId != null && args.voterSessionId.length >= MIN_SESSION_LEN) {
      patch.voterSessionId = args.voterSessionId;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
    return;
  }

  await ctx.db.insert('eventInvitees', {
    eventId: args.eventId,
    email,
    name: args.name,
    voterUserId: args.voterUserId,
    voterSessionId: args.voterSessionId,
    createdAt: now,
  });
}

/** Web guest optionally registers email for reminder delivery (DEV-435). */
export const registerGuestEmail = mutation({
  args: {
    shareToken: v.string(),
    voterSessionId: v.string(),
    voterName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = args.voterSessionId.trim();
    if (session.length < MIN_SESSION_LEN) {
      throw new ConvexError('Session invalid — refresh the page');
    }
    const token = args.shareToken.trim();
    if (token.length < 8) {
      throw new ConvexError('Invalid link');
    }
    const event = await ctx.db
      .query('events')
      .withIndex('by_share_token', (q) => q.eq('shareToken', token))
      .unique();
    if (event == null || event.status !== 'open') {
      throw new ConvexError('Event not found or voting is closed');
    }

    await upsertEventInvitee(ctx, {
      eventId: event._id,
      email: args.email,
      name: args.voterName.trim(),
      voterSessionId: session,
    });
  },
});

/** Signed-in invitee registers email for reminder delivery (DEV-435). */
export const registerAppUserEmail = mutation({
  args: {
    eventId: v.id('events'),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to save your email');
    }
    const userId = await ensureAppUserIdForAuthUser(ctx, authUser);
    const user = await ctx.db.get(userId);
    if (user == null) {
      throw new ConvexError('Account not found');
    }

    const event = await ctx.db.get(args.eventId);
    if (event == null || event.status !== 'open') {
      throw new ConvexError('Event not found or voting is closed');
    }
    if (event.ownerId === userId) {
      return;
    }

    const emailRaw = args.email?.trim() ?? user.email;
    await upsertEventInvitee(ctx, {
      eventId: args.eventId,
      email: emailRaw,
      name: user.name,
      voterUserId: userId,
    });
  },
});

export function inviteeVoterKey(invitee: {
  voterUserId?: Id<'users'>;
  voterSessionId?: string;
  name?: string;
}): string | null {
  if (invitee.voterUserId != null) {
    return `u:${invitee.voterUserId}`;
  }
  if (invitee.voterSessionId != null && invitee.voterSessionId.length >= MIN_SESSION_LEN) {
    return `s:${invitee.voterSessionId}`;
  }
  if (invitee.name != null && invitee.name.length > 0) {
    return `n:${invitee.name}`;
  }
  return null;
}

export function hasInviteeVoted(
  invitee: {
    voterUserId?: Id<'users'>;
    voterSessionId?: string;
    name?: string;
  },
  voterKeys: Set<string>,
): boolean {
  const key = inviteeVoterKey(invitee);
  if (key != null) {
    return voterKeys.has(key);
  }
  return false;
}

export { voterKey };
