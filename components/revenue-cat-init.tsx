import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  configurePurchases,
  identifyUser,
  isPurchasesConfigured,
  resetUser,
  supportsPurchasesPlatform,
} from '@/lib/purchases';

/**
 * Configures RevenueCat on iOS and web when a public SDK key is present.
 */
export function RevenueCatInit(): ReactElement | null {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!supportsPurchasesPlatform()) {
      return;
    }
    configurePurchases();
    if (!isPurchasesConfigured()) {
      return;
    }
    const uid = session?.user?.id;
    if (uid == null || uid.length === 0) {
      void resetUser();
      return;
    }
    void identifyUser(uid);
  }, [session?.user?.id]);

  return null;
}
