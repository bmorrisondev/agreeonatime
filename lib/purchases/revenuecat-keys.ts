import { Platform } from 'react-native';

function firstNonEmpty(keys: readonly (string | undefined)[]): string | undefined {
  for (const key of keys) {
    if (key != null && key.length > 0) {
      return key;
    }
  }
  return undefined;
}

/** App Store / iOS public SDK key (`appl_…`). */
export function getRevenueCatIosApiKey(): string | undefined {
  return firstNonEmpty([
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  ]);
}

/** Web Billing public SDK key (`rcb_…` / `rcb_sb_…`) or Test Store `test_…` fallback. */
export function getRevenueCatWebApiKey(): string | undefined {
  return firstNonEmpty([
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_WEB,
    process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY,
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.startsWith('test_')
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
      : undefined,
  ]);
}

/** Public RevenueCat key for the current platform. */
export function getRevenueCatApiKeyForPlatform(): string | undefined {
  if (Platform.OS === 'web') {
    return getRevenueCatWebApiKey();
  }
  if (Platform.OS === 'ios') {
    return getRevenueCatIosApiKey();
  }
  return undefined;
}
