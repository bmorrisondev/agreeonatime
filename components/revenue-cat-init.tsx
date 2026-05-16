import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { authClient } from '@/lib/auth-client';
import {
  configurePurchases,
  identifyUser,
  isPurchasesConfigured,
  resetUser,
} from '@/lib/purchases';

/**
 * Configures RevenueCat on native iOS when a public SDK key is present (DEV-393).
 */
export function RevenueCatInit(): ReactElement | null {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (Platform.OS !== 'ios') {
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
