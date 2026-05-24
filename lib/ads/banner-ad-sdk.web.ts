import type { BannerAdSdk } from '@/lib/ads/banner-ad-sdk';

/** Web export — native Google Mobile Ads SDK is not used on web. */
export function loadBannerAdSdk(): BannerAdSdk | null {
  return null;
}
