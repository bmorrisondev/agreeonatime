import type { ComponentType } from 'react';

export interface BannerAdSdk {
  readonly BannerAd: ComponentType<{
    readonly unitId: string;
    readonly size: string;
    readonly width?: number;
    readonly onAdLoaded?: () => void;
    readonly onAdFailedToLoad?: () => void;
  }>;
  readonly BannerAdSize: {
    readonly ANCHORED_ADAPTIVE_BANNER: string;
  };
}

let cachedBannerSdk: BannerAdSdk | null | undefined;

/** Loads banner components when `react-native-google-mobile-ads` is installed (DEV-451). */
export function loadBannerAdSdk(): BannerAdSdk | null {
  if (cachedBannerSdk !== undefined) {
    return cachedBannerSdk;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native dep (DEV-451)
    const mod = require('react-native-google-mobile-ads') as BannerAdSdk;
    cachedBannerSdk = mod;
    return mod;
  } catch {
    cachedBannerSdk = null;
    return null;
  }
}
