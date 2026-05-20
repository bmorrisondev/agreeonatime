import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { useConvexAuth } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { useAction } from 'convex/react';

import { useEntitlement } from '@/hooks/use-entitlement';
import { isPurchasesConfigured, supportsPurchasesPlatform } from '@/lib/purchases';

const syncFromRevenueCatAction = makeFunctionReference<'action'>('subscriptions:syncFromRevenueCat');

/**
 * Keeps Convex `users.proExpiresAt` aligned with RevenueCat for server-side limits.
 */
export function SubscriptionSync(): ReactElement | null {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const sync = useAction(syncFromRevenueCatAction);
  const { isPro, isLoaded, refresh } = useEntitlement();
  const sessionSynced = useRef(false);
  const lastPro = useRef<boolean | null>(null);

  const runSync = (): void => {
    void (async () => {
      try {
        await sync();
      } catch (err) {
        if (__DEV__) {
          console.warn('[SubscriptionSync] syncFromRevenueCat failed', err);
        }
      }
    })();
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      sessionSynced.current = false;
      lastPro.current = null;
      return;
    }
    if (
      supportsPurchasesPlatform() &&
      isPurchasesConfigured() &&
      !sessionSynced.current
    ) {
      sessionSynced.current = true;
      runSync();
    }
    void refresh();
  }, [isAuthenticated, isLoading, refresh]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !isLoaded ||
      !supportsPurchasesPlatform() ||
      !isPurchasesConfigured()
    ) {
      return;
    }
    if (lastPro.current === isPro) {
      return;
    }
    lastPro.current = isPro;
    runSync();
  }, [isAuthenticated, isLoaded, isPro]);

  return null;
}
