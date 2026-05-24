import Constants from 'expo-constants';

export type AdMobExtraConfig = {
  appIdIos?: string;
  appIdAndroid?: string;
  bannerUnitIdIos?: string;
  bannerUnitIdAndroid?: string;
  interstitialUnitIdIos?: string;
  interstitialUnitIdAndroid?: string;
  bannerUnitIdWeb?: string;
};

export function getAdMobExtra(): AdMobExtraConfig | undefined {
  const extra = Constants.expoConfig?.extra;
  if (extra == null || typeof extra !== 'object') {
    return undefined;
  }
  const admob = (extra as { admob?: unknown }).admob;
  if (admob == null || typeof admob !== 'object') {
    return undefined;
  }
  return admob as AdMobExtraConfig;
}
