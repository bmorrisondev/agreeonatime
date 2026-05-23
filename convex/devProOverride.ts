// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation } from './_generated/server';
import { authComponent } from './auth';
import { betterAuthUserIdString } from './users';

/** When true on a Convex deployment, dev Pro override mutations are allowed. Never set in production. */
export function isDevProOverrideDeploymentEnabled(): boolean {
  const raw = process.env.DEV_PRO_OVERRIDE_ENABLED;
  if (raw == null) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function userHasDevProOverride(user: Pick<Doc<'users'>, 'devProOverride'>): boolean {
  return isDevProOverrideDeploymentEnabled() && user.devProOverride === true;
}

/** Dev-only: grant or revoke Agree+ for the signed-in user without a subscription. */
export const setDevProOverride = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ enabled: boolean }> => {
    if (!isDevProOverrideDeploymentEnabled()) {
      throw new ConvexError('Dev Pro override is not enabled on this deployment');
    }

    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError('Sign in to change dev Pro override');
    }
    const authId = betterAuthUserIdString(authUser);
    if (authId == null) {
      throw new ConvexError('Sign in to change dev Pro override');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authId))
      .unique();
    if (!user) {
      throw new ConvexError('Account not found — try signing in again.');
    }

    await ctx.db.patch(user._id, {
      devProOverride: args.enabled ? true : undefined,
    });

    return { enabled: args.enabled };
  },
});
