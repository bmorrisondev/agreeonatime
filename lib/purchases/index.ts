import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

import {
  isPurchasesConfigured,
  markPurchasesConfigured,
} from '@/lib/purchases/configured-state';
import { isProFromCustomerInfo } from '@/lib/purchases/customer-info';
import {
  getAnnualPackagePriceLabel,
  getPackagePriceLabel,
  pickAnnualPackage,
  pickMonthlyPackage,
} from '@/lib/purchases/package-selection';
import { supportsPurchasesPlatform } from '@/lib/purchases/platform';
import { getRevenueCatApiKeyForPlatform } from '@/lib/purchases/revenuecat-keys';

export {
  LEGACY_TEST_STORE_PRODUCT_ID,
  PRO_ANNUAL_IOS_PRODUCT_ID,
  PRO_ANNUAL_STORE_PRODUCT_ID,
  PRO_ANNUAL_USD_DISPLAY,
  PRO_ENTITLEMENT_ID,
  PRO_MONTHLY_IOS_PRODUCT_ID,
  PRO_MONTHLY_STORE_PRODUCT_ID,
  PRO_MONTHLY_USD_DISPLAY,
  PRO_PRODUCT_IDS,
} from '@/lib/purchases/constants';
export { getProEntitlement, isProFromCustomerInfo } from '@/lib/purchases/customer-info';
export type { ProBillingPeriod } from '@/lib/purchases/billing-period';
export {
  getAnnualPackagePriceLabel,
  getPackagePriceLabel,
  pickAnnualPackage,
  pickMonthlyPackage,
} from '@/lib/purchases/package-selection';
export {
  getAnnualStoreProduct,
  getAnnualStoreProductPriceLabel,
  purchaseAnnualSubscription,
} from '@/lib/purchases/annual-product';
export {
  getMonthlyStoreProduct,
  getStoreProductPriceLabel,
  purchaseMonthlySubscription,
} from '@/lib/purchases/monthly-product';
export { purchaseProSubscription } from '@/lib/purchases/purchase-pro-subscription';
export { isPurchasesConfigured } from '@/lib/purchases/configured-state';
export { supportsPurchasesPlatform } from '@/lib/purchases/platform';
export {
  getRevenueCatApiKeyForPlatform,
  getRevenueCatIosApiKey,
  getRevenueCatWebApiKey,
} from '@/lib/purchases/revenuecat-keys';
export {
  canOpenSubscriptionManagement,
  getManagementUrlFromCustomerInfo,
  openSubscriptionManagement,
} from '@/lib/purchases/subscription-management';

/**
 * Initialise the RevenueCat SDK once (iOS + web).
 */
export function configurePurchases(): void {
  if (!supportsPurchasesPlatform() || isPurchasesConfigured()) {
    return;
  }

  const apiKey = getRevenueCatApiKeyForPlatform();
  if (apiKey == null) {
    if (__DEV__) {
      console.warn(
        `[RevenueCat] No public ${Platform.OS} API key in env — skipping SDK init`,
      );
    }
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  } else {
    void Purchases.setLogLevel(LOG_LEVEL.WARN);
  }

  Purchases.configure({ apiKey });
  markPurchasesConfigured();
}

/**
 * Identify the current user in RevenueCat.
 * Uses the Better Auth user id (opaque string, no PII).
 */
export async function identifyUser(appUserID: string): Promise<void> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return;
  }
  try {
    await Purchases.logIn(appUserID);
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] logIn failed', err);
    }
  }
}

/**
 * Reset RevenueCat to an anonymous user (call on sign-out).
 */
export async function resetUser(): Promise<void> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return;
  }
  try {
    await Purchases.logOut();
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] logOut failed', err);
    }
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] getCustomerInfo failed', err);
    }
    return null;
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] getOfferings failed', err);
    }
    return null;
  }
}

export async function getDefaultPackage(): Promise<PurchasesPackage | null> {
  const offerings = await getOfferings();
  if (offerings == null) {
    return null;
  }
  return pickMonthlyPackage(offerings);
}

export async function getAnnualPackage(): Promise<PurchasesPackage | null> {
  const offerings = await getOfferings();
  if (offerings == null) {
    return null;
  }
  return pickAnnualPackage(offerings);
}

/** @deprecated Use {@link pickMonthlyPackage} or {@link pickAnnualPackage}. */
export function pickDefaultPackage(offerings: PurchasesOfferings): PurchasesPackage | null {
  return pickMonthlyPackage(offerings);
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function purchaseDefaultPackage(): Promise<CustomerInfo | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }
  const pkg = await getDefaultPackage();
  if (pkg == null) {
    return null;
  }
  return purchasePackage(pkg);
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] restorePurchases failed', err);
    }
    return null;
  }
}

export function addCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return;
  }
  Purchases.addCustomerInfoUpdateListener(listener);
}

export async function readIsProFromSdk(): Promise<boolean> {
  const info = await getCustomerInfo();
  return info != null && isProFromCustomerInfo(info);
}
