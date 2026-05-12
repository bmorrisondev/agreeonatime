import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { makeFunctionReference } from 'convex/server';
import { useConvexAuth, useMutation } from 'convex/react';

import { isConvexConfigured } from '@/lib/convex/client';

/** `convex/users.ts` — matches generated `api.users.ensureProfile` after `pnpm convex:dev`. */
const ensureProfileMutation = makeFunctionReference<'mutation'>('users:ensureProfile');

/**
 * After Better Auth signs in, upsert the app `users` row (see `convex/users.ts`).
 */
export function EnsureConvexUser(): ReactElement | null {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureProfile = useMutation(ensureProfileMutation);
  const profileEnsured = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      profileEnsured.current = false;
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isConvexConfigured() || isLoading || !isAuthenticated || profileEnsured.current) {
      return;
    }
    profileEnsured.current = true;
    void ensureProfile({}).catch(() => {
      profileEnsured.current = false;
    });
  }, [ensureProfile, isAuthenticated, isLoading]);

  return null;
}
