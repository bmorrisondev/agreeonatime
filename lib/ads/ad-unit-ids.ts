import { Platform } from 'react-native';

import { getAdMobExtra } from '@/lib/ads/extra';

function firstNonEmpty(values: readonly (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value != null && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function envBannerUnitId(): string | undefined {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID;
  }
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_WEB;
  }
  return undefined;
}

function envInterstitialUnitId(): string | undefined {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_IOS;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_ANDROID;
  }
  return undefined;
}

function extraBannerUnitId(): string | undefined {
  const extra = getAdMobExtra();
  if (extra == null) {
    return undefined;
  }
  if (Platform.OS === 'ios') {
    return extra.bannerUnitIdIos;
  }
  if (Platform.OS === 'android') {
    return extra.bannerUnitIdAndroid;
  }
  if (Platform.OS === 'web') {
    return extra.bannerUnitIdWeb;
  }
  return undefined;
}

function extraInterstitialUnitId(): string | undefined {
  const extra = getAdMobExtra();
  if (extra == null) {
    return undefined;
  }
  if (Platform.OS === 'ios') {
    return extra.interstitialUnitIdIos;
  }
  if (Platform.OS === 'android') {
    return extra.interstitialUnitIdAndroid;
  }
  return undefined;
}

/** Production banner ad unit id from env or app config extra (not resolved for __DEV__). */
export function getConfiguredBannerAdUnitId(): string | undefined {
  return firstNonEmpty([envBannerUnitId(), extraBannerUnitId()]);
}

/** Production interstitial ad unit id from env or app config extra (not resolved for __DEV__). */
export function getConfiguredInterstitialAdUnitId(): string | undefined {
  return firstNonEmpty([envInterstitialUnitId(), extraInterstitialUnitId()]);
}
