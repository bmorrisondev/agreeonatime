import { useMemo } from 'react';
import { Platform } from 'react-native';

import { useSubscription } from '@/hooks/use-subscription';
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
 * App surfaces: Convex + RevenueCat pro state via {@link useSubscription} (DEV-452).
 * Web vote page: pass `voterMode` + `ownerHasActiveSub` from the guest event query (DEV-454).
 * Web signed-in app: same gate as iOS via {@link useSubscription}.
 */
export function useAdEligibility(options?: UseAdEligibilityOptions): AdEligibilityState {
  const voterMode = options?.voterMode === true;
  const subscription = useSubscription();

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

    if (Platform.OS !== 'ios' && Platform.OS !== 'web') {
      return AD_ELIGIBILITY_SUPPRESSED;
    }

    if (!subscription.isLoaded) {
      return AD_ELIGIBILITY_LOADING;
    }

    return {
      showAds: !subscription.isPro,
      loading: false,
    };
  }, [voterMode, options?.ownerHasActiveSub, subscription.isLoaded, subscription.isPro]);
}
