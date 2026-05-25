import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useAdEligibility } from '@/hooks/use-ad-eligibility';
import { preloadPostConfirmInterstitial } from '@/lib/ads/post-confirm-interstitial.native';

/** Preloads post-confirm interstitial while owner views open event detail (DEV-453). */
export function AdInterstitial(): ReactElement | null {
  const { showAds, loading } = useAdEligibility();

  useEffect(() => {
    if (loading || !showAds) {
      return;
    }
    preloadPostConfirmInterstitial();
  }, [loading, showAds]);

  return null;
}

export { showPostConfirmInterstitial } from '@/lib/ads/post-confirm-interstitial.native';
