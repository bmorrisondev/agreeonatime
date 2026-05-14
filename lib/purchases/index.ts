import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const isNativeIOS = Platform.OS === 'ios';

/**
 * Initialise the RevenueCat SDK (iOS-only for v1.0).
 * Safe to call on any platform — non-iOS is a no-op.
 */
export function configurePurchases(): void {
  if (!isNativeIOS) return;

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
  if (apiKey == null || apiKey.length === 0) {
    if (__DEV__) {
      console.warn('[RevenueCat] EXPO_PUBLIC_REVENUECAT_API_KEY_IOS is not set — skipping SDK init');
    }
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey });
}

/**
 * Identify the current user in RevenueCat.
 * Uses the Better Auth user id (opaque string, no PII).
 */
export async function identifyUser(appUserID: string): Promise<void> {
  if (!isNativeIOS) return;
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
  if (!isNativeIOS) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    if (__DEV__) console.warn('[RevenueCat] logOut failed', err);
  }
}
