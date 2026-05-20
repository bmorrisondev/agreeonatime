import { useCallback, useEffect, useState } from 'react';

import {
  addCustomerInfoUpdateListener,
  getCustomerInfo,
  isProFromCustomerInfo,
  isPurchasesConfigured,
  supportsPurchasesPlatform,
} from '@/lib/purchases';

export interface EntitlementState {
  readonly isPro: boolean;
  readonly isLoaded: boolean;
  readonly refresh: () => Promise<void>;
}

export function useEntitlement(): EntitlementState {
  const purchasesPlatform = supportsPurchasesPlatform();
  const [isPro, setIsPro] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!purchasesPlatform);

  const refresh = useCallback(async () => {
    if (!purchasesPlatform || !isPurchasesConfigured()) {
      setIsPro(false);
      setIsLoaded(true);
      return;
    }
    const info = await getCustomerInfo();
    setIsPro(info != null && isProFromCustomerInfo(info));
    setIsLoaded(true);
  }, [purchasesPlatform]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!purchasesPlatform || !isPurchasesConfigured()) {
      return;
    }
    let active = true;
    addCustomerInfoUpdateListener((info) => {
      if (!active) {
        return;
      }
      setIsPro(isProFromCustomerInfo(info));
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [purchasesPlatform]);

  return { isPro, isLoaded, refresh };
}
