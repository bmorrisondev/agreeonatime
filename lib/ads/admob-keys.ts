import { Platform } from 'react-native';

import {
  AD_PLACEMENT_IDS,
  GOOGLE_TEST_AD_UNITS,
  GOOGLE_TEST_APP_IDS,
  type AdPlacementId,
} from '@/lib/ads/constants';

function firstNonEmpty(keys: readonly (string | undefined)[]): string | undefined {
  for (const key of keys) {
    if (key != null && key.length > 0) {
      return key;
    }
  }
  return undefined;
}

/** AdMob iOS application id (`ca-app-pub-…~…`). */
export function getAdMobIosAppId(): string | undefined {
  return firstNonEmpty([
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS,
  ]);
}

/** AdMob web application id for Expo Web surfaces. */
export function getAdMobWebAppId(): string | undefined {
  return firstNonEmpty([process.env.EXPO_PUBLIC_ADMOB_WEB_APP_ID]);
}

/** AdMob app id for the current platform. */
export function getAdMobAppIdForPlatform(): string | undefined {
  if (Platform.OS === 'web') {
    return getAdMobWebAppId();
  }
  if (Platform.OS === 'ios') {
    return getAdMobIosAppId();
  }
  return undefined;
}

const PLACEMENT_ENV_KEYS: Record<AdPlacementId, string> = {
  [AD_PLACEMENT_IDS.eventListBanner]: 'EXPO_PUBLIC_ADMOB_EVENT_LIST_BANNER_UNIT_ID',
  [AD_PLACEMENT_IDS.eventDetailBanner]: 'EXPO_PUBLIC_ADMOB_EVENT_DETAIL_BANNER_UNIT_ID',
  [AD_PLACEMENT_IDS.postConfirmInterstitial]:
    'EXPO_PUBLIC_ADMOB_POST_CONFIRM_INTERSTITIAL_UNIT_ID',
  [AD_PLACEMENT_IDS.webVoteBanner]: 'EXPO_PUBLIC_ADMOB_WEB_VOTE_BANNER_UNIT_ID',
};

function getConfiguredAdUnitId(placement: AdPlacementId): string | undefined {
  const envKey = PLACEMENT_ENV_KEYS[placement];
  const value = process.env[envKey];
  return value != null && value.length > 0 ? value : undefined;
}

function getTestAdUnitIdForPlacement(placement: AdPlacementId): string {
  if (placement === AD_PLACEMENT_IDS.postConfirmInterstitial) {
    return GOOGLE_TEST_AD_UNITS.interstitial;
  }
  return GOOGLE_TEST_AD_UNITS.banner;
}

function shouldUseTestAdUnits(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';
}

/**
 * Resolved ad unit id for a placement.
 * Preview/dev (`EXPO_PUBLIC_DEV_TOOLS` or `__DEV__`): Google test units (guaranteed fill).
 * Production: env-configured unit ids only.
 */
export function getAdUnitIdForPlacement(placement: AdPlacementId): string | undefined {
  if (shouldUseTestAdUnits()) {
    return getTestAdUnitIdForPlacement(placement);
  }
  return getConfiguredAdUnitId(placement);
}

/** Whether env (or dev test fallback) provides enough config to request ads. */
export function hasAdMobConfigForPlatform(): boolean {
  const appId = getAdMobAppIdForPlatform();
  if (appId != null) {
    return true;
  }
  if (shouldUseTestAdUnits() && (Platform.OS === 'ios' || Platform.OS === 'web')) {
    return true;
  }
  return false;
}

/** App id used at SDK init — production env or dev test id. */
export function resolveAdMobAppIdForInit(): string | undefined {
  const configured = getAdMobAppIdForPlatform();
  if (configured != null) {
    return configured;
  }
  if (shouldUseTestAdUnits() && Platform.OS === 'ios') {
    return GOOGLE_TEST_APP_IDS.ios;
  }
  return undefined;
}
