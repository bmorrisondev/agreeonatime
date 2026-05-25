import { hasAdMobConfigForPlatform, resolveAdMobAppIdForInit } from '@/lib/ads/admob-keys';
import { isAdsInitialized, markAdsInitialized } from '@/lib/ads/configured-state';
import { shouldLogAdMobDiagnostics } from '@/lib/ads/log-diagnostics';
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
      if (shouldLogAdMobDiagnostics()) {
        console.warn('[AdMob] No app id in env — skipping SDK init');
      }
      return;
    }

    const appId = resolveAdMobAppIdForInit();
    if (appId == null) {
      if (shouldLogAdMobDiagnostics()) {
        console.warn('[AdMob] Could not resolve app id — skipping SDK init');
      }
      return;
    }

    if (!isMobileAdsSdkInstalled()) {
      if (shouldLogAdMobDiagnostics()) {
        console.warn('[AdMob] react-native-google-mobile-ads not installed');
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
      if (shouldLogAdMobDiagnostics()) {
        console.info('[AdMob] initializeAds — MobileAds ready', { appId: `${appId.slice(0, 20)}…` });
      }
    } catch (err) {
      console.warn('[AdMob] MobileAds.initialize failed', err);
    }
  })();

  return initPromise;
}
