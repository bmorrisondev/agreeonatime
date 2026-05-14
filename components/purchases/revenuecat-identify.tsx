import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { useConvexAuth } from 'convex/react';

import { authClient } from '@/lib/auth-client';
import { identifyUser, resetUser } from '@/lib/purchases';

/**
 * Renderless component that syncs the authenticated user with RevenueCat.
 *
 * Place alongside `<EnsureConvexUser />` inside the auth provider tree.
 * Uses the Better Auth session `user.id` (stable, opaque — no PII).
 */
export function RevenueCatIdentify(): ReactElement | null {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const session = authClient.useSession();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const userId = isAuthenticated ? session.data?.user?.id : undefined;

    if (userId != null && identifiedRef.current !== userId) {
      identifiedRef.current = userId;
      void identifyUser(userId);
    }

    if (!isAuthenticated && identifiedRef.current != null) {
      identifiedRef.current = null;
      void resetUser();
    }
  }, [isAuthenticated, isLoading, session.data?.user?.id]);

  return null;
}
