/**
 * RevenueCat public iOS SDK key from EAS / .env.
 * eas.json uses EXPO_PUBLIC_REVENUECAT_API_KEY; older code used other names.
 */
export function getRevenueCatIosApiKey(): string | undefined {
  const candidates = [
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  ];
  for (const key of candidates) {
    if (key != null && key.length > 0) {
      return key;
    }
  }
  return undefined;
}
