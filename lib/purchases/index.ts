import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { getRevenueCatIosApiKey } from '@/lib/purchases/revenuecat-ios-key';

const isNativeIOS = Platform.OS === 'ios';

let configured = false;

/**
 * Initialise the RevenueCat SDK once (iOS-only for v1.0).
 */
export function configurePurchases(): void {
  if (!isNativeIOS || configured) {
    return;
  }

  const apiKey = getRevenueCatIosApiKey();
  if (apiKey == null) {
    if (__DEV__) {
      console.warn('[RevenueCat] No public iOS API key in env — skipping SDK init');
    }
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  } else {
    void Purchases.setLogLevel(LOG_LEVEL.WARN);
  }

  Purchases.configure({ apiKey });
  configured = true;
}

export function isPurchasesConfigured(): boolean {
  return configured;
}

/**
 * Identify the current user in RevenueCat.
 * Uses the Better Auth user id (opaque string, no PII).
 */
export async function identifyUser(appUserID: string): Promise<void> {
  if (!isNativeIOS || !configured) return;
  try {
    await Purchases.logIn(appUserID);
  } catch (err) {
    if (__DEV__) console.warn('[RevenueCat] logIn failed', err);
  }
}

/**
 * Reset RevenueCat to an anonymous user (call on sign-out).
 */
export async function resetUser(): Promise<void> {
  if (!isNativeIOS || !configured) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    if (__DEV__) console.warn('[RevenueCat] logOut failed', err);
  }
}
