import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

/** Google-provided sample AdMob app IDs (safe for dev / config fallbacks). */
const ADMOB_GOOGLE_SAMPLE_APP_IDS = {
  ios: 'ca-app-pub-3940256099942544~1458002511',
  android: 'ca-app-pub-3940256099942544~3347511713',
} as const;

const ATT_USAGE_DESCRIPTION =
  'Allow Agree on a Time to use your device identifier to show ads that are more relevant to you.';

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed != null && trimmed.length > 0 ? trimmed : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = appJson.expo as ExpoConfig;

  const iosAppId =
    trimEnv(process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS) ?? ADMOB_GOOGLE_SAMPLE_APP_IDS.ios;
  const androidAppId =
    trimEnv(process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID) ??
    ADMOB_GOOGLE_SAMPLE_APP_IDS.android;

  const pluginsWithoutAdMob = (base.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return (
      name !== 'react-native-google-mobile-ads' && name !== 'expo-tracking-transparency'
    );
  });

  const baseExtra =
    base.extra != null && typeof base.extra === 'object'
      ? (base.extra as Record<string, unknown>)
      : {};

  return {
    ...base,
    ...config,
    ios: {
      ...base.ios,
      ...config.ios,
      infoPlist: {
        ...(base.ios?.infoPlist ?? {}),
        ...(config.ios?.infoPlist ?? {}),
      },
    },
    plugins: [
      ...pluginsWithoutAdMob,
      [
        'react-native-google-mobile-ads',
        {
          androidAppId,
          iosAppId,
        },
      ],
      [
        'expo-tracking-transparency',
        {
          userTrackingPermission: ATT_USAGE_DESCRIPTION,
        },
      ],
    ],
    extra: {
      ...baseExtra,
      ...(config.extra != null && typeof config.extra === 'object'
        ? (config.extra as Record<string, unknown>)
        : {}),
      admob: {
        appIdIos: iosAppId,
        appIdAndroid: androidAppId,
        bannerUnitIdIos: trimEnv(process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS) ?? '',
        bannerUnitIdAndroid:
          trimEnv(process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID) ?? '',
        interstitialUnitIdIos:
          trimEnv(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_IOS) ?? '',
        interstitialUnitIdAndroid:
          trimEnv(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_ANDROID) ?? '',
        bannerUnitIdWeb: trimEnv(process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_WEB) ?? '',
      },
    },
  };
};
