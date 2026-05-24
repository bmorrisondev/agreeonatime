import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { useAdEligibilityStore } from '@/lib/store/ad-eligibility-store';
import {
  AD_ELIGIBILITY_LOADING,
  AD_ELIGIBILITY_SUPPRESSED,
  resolveWebVoteShowAds,
  type AdEligibilityState,
} from '@/lib/ads/subscription-gate';

export type { AdEligibilityState };

export interface UseAdEligibilityOptions {
  /** Web vote page: gate on event owner's subscription (DEV-454). */
  readonly voterMode?: boolean;
  /** From `guestEvents:getByShareToken` when `voterMode` is true. */
  readonly ownerHasActiveSub?: boolean;
}

/**
 * App surfaces: RevenueCat entitlement via Zustand (DEV-452).
 * Web vote page: pass `voterMode` + `ownerHasActiveSub` from the guest event query (DEV-454).
 */
export function useAdEligibility(options?: UseAdEligibilityOptions): AdEligibilityState {
  const voterMode = options?.voterMode === true;
  const storeShowAds = useAdEligibilityStore((state) => state.showAds);
  const storeLoading = useAdEligibilityStore((state) => state.loading);
  const ensureLoaded = useAdEligibilityStore((state) => state.ensureLoaded);
  const registerCustomerInfoListener = useAdEligibilityStore(
    (state) => state.registerCustomerInfoListener,
  );

  useEffect(() => {
    if (voterMode) {
      return;
    }
    registerCustomerInfoListener();
    void ensureLoaded();
  }, [voterMode, ensureLoaded, registerCustomerInfoListener]);

  return useMemo((): AdEligibilityState => {
    if (voterMode) {
      if (Platform.OS !== 'web') {
        return AD_ELIGIBILITY_SUPPRESSED;
      }
      if (options?.ownerHasActiveSub === undefined) {
        return AD_ELIGIBILITY_LOADING;
      }
      return {
        showAds: resolveWebVoteShowAds({ ownerHasActiveSub: options.ownerHasActiveSub }),
        loading: false,
      };
    }

    return { showAds: storeShowAds, loading: storeLoading };
  }, [voterMode, options?.ownerHasActiveSub, storeShowAds, storeLoading]);
}
