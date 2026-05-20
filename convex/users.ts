// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';

import { authComponent, createAuth } from './auth';
import { deleteEventAndDependents } from './eventDeletion';

/** Better Auth adapter returns Convex docs — use `_id` when `id` is absent. */
export function betterAuthUserIdString(authUser: { id?: string; _id?: string } | null | undefined): string | null {
  if (authUser == null) {
    return null;
  }
  const raw = authUser.id ?? authUser._id;
  const s = typeof raw === 'string' ? raw : String(raw ?? '');
  return s.length > 0 ? s : null;
}

/**
 * Upserts app `users` for the Better Auth identity. Used by `ensureProfile` and other mutations
 * so writes do not race the client `EnsureConvexUser` effect.
 */
export async function ensureAppUserIdForAuthUser(ctx: MutationCtx, authUser: any): Promise<Id<'users'>> {
  const authId = betterAuthUserIdString(authUser);
  if (authId == null) {
    throw new ConvexError('Account id missing — try signing in again.');
  }
  const email = authUser.email as string;
  const name = (authUser.name as string) ?? '';

  const byAuth = await ctx.db
    .query('users')
    .withIndex('by_auth_user', (q) => q.eq('authUserId', authId))
    .unique();
  if (byAuth) {
    return byAuth._id;
  }

  const byEmail = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique();
  if (byEmail) {
    await ctx.db.patch(byEmail._id, { authUserId: authId, name: name || byEmail.name });
    return byEmail._id;
  }

  return await ctx.db.insert('users', {
    authUserId: authId,
    email,
    name,
    createdAt: Date.now(),
    pushTokens: [],
  });
}

/** Ensures a row exists in app `users` for the signed-in Better Auth identity (DEV-382). */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }
    return await ensureAppUserIdForAuthUser(ctx, authUser);
  },
});

/** Returns the current user's profile for settings display. */
export const getCurrentUser = query({
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
    return { _id: user._id, email: user.email, name: user.name };
  },
});

/** Register or refresh this device's Expo push token (DEV-391). */
export const registerPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<void> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to enable notifications');
    }
    const userId = await ensureAppUserIdForAuthUser(ctx, authUser);
    const t = token.trim();
    if (t.length === 0) {
      return;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return;
    }
    const deduped = Array.from(new Set([...user.pushTokens, t]));
    await ctx.db.patch(userId, { pushTokens: deduped });
  },
});

const BATCH_SIZE = 256;

/**
 * Cascade-deletes all user data then removes the users row and the
 * Better Auth identity (DEV-394). Processes up to BATCH_SIZE child rows
 * per table; if more remain, schedules itself to continue.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to delete your account');
    }
    const authId = betterAuthUserIdString(authUser);
    if (authId == null) {
      throw new ConvexError('Account id missing');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authId))
      .unique();
    if (!user) {
      throw new ConvexError('User not found');
    }

    const ownedEvents = await ctx.db
      .query('events')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .take(BATCH_SIZE);

    for (const event of ownedEvents) {
      await deleteEventAndDependents(ctx, event._id);
    }

    // Delete votes cast by this user on other people's events
    const userVotes = await ctx.db
      .query('votes')
      .withIndex('by_event')
      .filter((q) => q.eq(q.field('voterUserId'), user._id))
      .take(BATCH_SIZE);
    for (const vote of userVotes) {
      await ctx.db.delete(vote._id);
    }

    await ctx.db.delete(user._id);

    // Remove the Better Auth identity so the user cannot sign in again.
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.deleteUser({ headers });
  },
});
