// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { mutation, query } from './_generated/server';

import { authComponent } from './auth';

/** Current app user row for analytics + profile UI (DEV-397). */
export const currentProfile = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }
    const row = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUser.id))
      .unique();
    if (!row) {
      return null;
    }
    return {
      _id: row._id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
    };
  },
});

/** Ensures a row exists in app `users` for the signed-in Better Auth identity (DEV-382). */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const authId = authUser.id as string;
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
  },
});
