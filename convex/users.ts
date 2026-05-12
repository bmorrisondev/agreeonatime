// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, type MutationCtx } from './_generated/server';

import { authComponent } from './auth';

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
