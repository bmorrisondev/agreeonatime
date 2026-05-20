import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { configurePurchases, supportsPurchasesPlatform } from '@/lib/purchases';

/**
 * Configures RevenueCat on iOS and web when a public SDK key is present (DEV-393, DEV-431).
 * User identification runs in {@link RevenueCatIdentify}.
 */
export function RevenueCatInit(): ReactElement | null {
  useEffect(() => {
    if (!supportsPurchasesPlatform()) {
      return;
    }
    configurePurchases();
  }, []);

  return null;
}
