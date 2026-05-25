import { AD_PLACEMENT_IDS } from '@/lib/ads/constants';
import { getAdUnitIdForPlacement } from '@/lib/ads/admob-keys';
import { loadInterstitialAdSdk, type InterstitialAdInstance } from '@/lib/ads/interstitial-ad-sdk';
import {
  hasShownInterstitialThisSession,
  markInterstitialShownThisSession,
} from '@/lib/ads/interstitial-session';

let preloadedAd: InterstitialAdInstance | null = null;
let isLoaded = false;
let isLoading = false;

export function preloadPostConfirmInterstitial(): void {
  if (isLoading || isLoaded || preloadedAd != null) {
    return;
  }

  const sdk = loadInterstitialAdSdk();
  const unitId = getAdUnitIdForPlacement(AD_PLACEMENT_IDS.postConfirmInterstitial);
  if (sdk == null || unitId == null) {
    return;
  }

  isLoading = true;
  const ad = sdk.InterstitialAd.createForAdRequest(unitId);
  ad.addAdEventListener(sdk.AdEventType.LOADED, () => {
    isLoaded = true;
    isLoading = false;
  });
  ad.addAdEventListener(sdk.AdEventType.ERROR, () => {
    isLoaded = false;
    isLoading = false;
    preloadedAd = null;
  });
  ad.addAdEventListener(sdk.AdEventType.CLOSED, () => {
    isLoaded = false;
    preloadedAd = null;
  });

  preloadedAd = ad;
  ad.load();
}

export async function showPostConfirmInterstitial(): Promise<void> {
  if (hasShownInterstitialThisSession()) {
    return;
  }
  if (preloadedAd == null || !isLoaded) {
    return;
  }

  markInterstitialShownThisSession();
  try {
    await preloadedAd.show();
  } catch (err) {
    if (__DEV__) {
      console.warn('[AdMob] post-confirm interstitial show failed', err);
    }
  }
}
