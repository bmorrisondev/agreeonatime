import type { ReactElement } from 'react';

/** Default stub — native implementation preloads interstitials on iOS (DEV-453). */
export function AdInterstitial(): ReactElement | null {
  return null;
}

export { showPostConfirmInterstitial } from '@/lib/ads/post-confirm-interstitial';
