import { hasAdMobConfigForPlatform, resolveAdMobAppIdForInit } from '@/lib/ads/admob-keys';
import { isAdsInitialized, markAdsInitialized } from '@/lib/ads/configured-state';
import { supportsAdsPlatform } from '@/lib/ads/platform';
import { isMobileAdsSdkInstalled, loadMobileAdsSdk } from '@/lib/ads/sdk';

let initPromise: Promise<void> | null = null;

/**
 * Initialise Google Mobile Ads once per session when the SDK is installed (DEV-451)
 * and an app id is available (env or dev test id).
 */
export function initializeAds(): Promise<void> {
  if (!supportsAdsPlatform() || isAdsInitialized()) {
    return Promise.resolve();
  }

  if (initPromise != null) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!hasAdMobConfigForPlatform()) {
      if (__DEV__) {
        console.warn('[AdMob] No app id in env — skipping SDK init');
      }
      return;
    }

    const appId = resolveAdMobAppIdForInit();
    if (appId == null) {
      if (__DEV__) {
        console.warn('[AdMob] Could not resolve app id — skipping SDK init');
      }
      return;
    }

    if (!isMobileAdsSdkInstalled()) {
      if (__DEV__) {
        console.warn('[AdMob] react-native-google-mobile-ads not installed — add in DEV-451');
      }
      return;
    }

    const sdk = loadMobileAdsSdk();
    if (sdk == null) {
      return;
    }

    try {
      await sdk.MobileAds().initialize();
      markAdsInitialized();
      if (__DEV__) {
        console.info('[AdMob] MobileAds initialized', { appId: `${appId.slice(0, 20)}…` });
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[AdMob] MobileAds.initialize failed', err);
      }
    }
  })();

  return initPromise;
}
