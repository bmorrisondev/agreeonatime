import mobileAds from 'react-native-google-mobile-ads';

import {
  isAdMobConfigured,
  markAdMobConfigured,
} from '@/lib/ads/configured-state';
import { supportsAdMobPlatform } from '@/lib/ads/platform';

/**
 * Initialise the Google Mobile Ads SDK once (iOS / Android).
 */
export async function configureAds(): Promise<void> {
  if (!supportsAdMobPlatform() || isAdMobConfigured()) {
    return;
  }

  try {
    await mobileAds().initialize();
    markAdMobConfigured();
  } catch (error: unknown) {
    console.warn('[AdMob] mobileAds().initialize failed', error);
  }
}
