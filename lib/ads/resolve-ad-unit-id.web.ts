import { getConfiguredBannerAdUnitId } from '@/lib/ads/ad-unit-ids';
import type { AdMobAdFormat } from '@/lib/ads/types';

/** Web has no Google Mobile Ads SDK; only banner env/extra is exposed for future use. */
export function resolveAdUnitId(format: AdMobAdFormat): string | undefined {
  if (format !== 'banner') {
    return undefined;
  }
  return getConfiguredBannerAdUnitId();
}
