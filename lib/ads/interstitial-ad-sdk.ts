export interface InterstitialAdInstance {
  load: () => void;
  show: () => Promise<void>;
  addAdEventListener: (type: string, listener: () => void) => void;
}

export interface InterstitialAdSdk {
  readonly InterstitialAd: {
    createForAdRequest: (unitId: string) => InterstitialAdInstance;
  };
  readonly AdEventType: {
    readonly LOADED: string;
    readonly ERROR: string;
    readonly CLOSED: string;
  };
}

let cachedSdk: InterstitialAdSdk | null | undefined;

/** Loads interstitial API when `react-native-google-mobile-ads` is installed (DEV-451). */
export function loadInterstitialAdSdk(): InterstitialAdSdk | null {
  if (cachedSdk !== undefined) {
    return cachedSdk;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native dep (DEV-451)
    const mod = require('react-native-google-mobile-ads') as InterstitialAdSdk;
    cachedSdk = mod;
    return mod;
  } catch {
    cachedSdk = null;
    return null;
  }
}
