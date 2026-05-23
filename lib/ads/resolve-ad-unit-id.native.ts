import { TestIds } from 'react-native-google-mobile-ads';

import {
  getConfiguredBannerAdUnitId,
  getConfiguredInterstitialAdUnitId,
} from '@/lib/ads/ad-unit-ids';
import type { AdMobAdFormat } from '@/lib/ads/types';

function configuredUnitId(format: AdMobAdFormat): string | undefined {
  return format === 'banner'
    ? getConfiguredBannerAdUnitId()
    : getConfiguredInterstitialAdUnitId();
}

function testUnitId(format: AdMobAdFormat): string {
  return format === 'banner' ? TestIds.BANNER : TestIds.INTERSTITIAL;
}

/**
 * Resolves an ad unit id for the current native platform.
 * Uses Google test ids in __DEV__; production requires env/extra configuration.
 */
export function resolveAdUnitId(format: AdMobAdFormat): string | undefined {
  if (__DEV__) {
    return testUnitId(format);
  }
  return configuredUnitId(format);
}
