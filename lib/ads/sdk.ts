/**
 * Optional bridge to `react-native-google-mobile-ads` (installed in DEV-451).
 * Keeps the app buildable before the native dependency is added.
 */

export interface MobileAdsSdk {
  readonly MobileAds: () => {
    initialize: () => Promise<void>;
  };
}

let cachedSdk: MobileAdsSdk | null | undefined;

/**
 * Returns the AdMob SDK module when installed; otherwise `null`.
 */
export function loadMobileAdsSdk(): MobileAdsSdk | null {
  if (cachedSdk !== undefined) {
    return cachedSdk;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native dep (DEV-451)
    const mod = require('react-native-google-mobile-ads') as MobileAdsSdk;
    cachedSdk = mod;
    return mod;
  } catch {
    cachedSdk = null;
    return null;
  }
}

export function isMobileAdsSdkInstalled(): boolean {
  return loadMobileAdsSdk() != null;
}
