import { useEffect } from 'react';

import { useAdEligibilityStore } from '@/lib/store/ad-eligibility-store';

export interface AdEligibilityState {
  readonly showAds: boolean;
  readonly loading: boolean;
}

/**
 * Shared gate for ad components — reads RevenueCat CustomerInfo once, caches in Zustand,
 * and updates in real time when entitlements change.
 */
export function useAdEligibility(): AdEligibilityState {
  const showAds = useAdEligibilityStore((state) => state.showAds);
  const loading = useAdEligibilityStore((state) => state.loading);
  const ensureLoaded = useAdEligibilityStore((state) => state.ensureLoaded);
  const registerCustomerInfoListener = useAdEligibilityStore((state) => state.registerCustomerInfoListener);

  useEffect(() => {
    registerCustomerInfoListener();
    void ensureLoaded();
  }, [ensureLoaded, registerCustomerInfoListener]);

  return { showAds, loading };
}
