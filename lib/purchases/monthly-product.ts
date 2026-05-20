import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import {
  LEGACY_TEST_STORE_PRODUCT_ID,
  PRO_MONTHLY_IOS_PRODUCT_ID,
  PRO_MONTHLY_STORE_PRODUCT_ID,
  PRO_MONTHLY_USD_DISPLAY,
} from '@/lib/purchases/constants';
import { pickMonthlyPackage } from '@/lib/purchases/package-selection';
import { isPurchasesConfigured } from '@/lib/purchases/configured-state';
import { supportsPurchasesPlatform } from '@/lib/purchases/platform';

const LEGACY_PRICE_LABELS = new Set(['$9.99', 'US$9.99', '9,99 $US']);

const MONTHLY_PRODUCT_IDS = [
  PRO_MONTHLY_STORE_PRODUCT_ID,
  PRO_MONTHLY_IOS_PRODUCT_ID,
] as const;

export function isLegacyMonthlyProductId(productId: string): boolean {
  return productId === LEGACY_TEST_STORE_PRODUCT_ID;
}

export function getStoreProductPriceLabel(product: PurchasesStoreProduct | null): string | null {
  if (product == null) {
    return null;
  }
  const price = product.priceString?.trim();
  if (isLegacyMonthlyProductId(product.identifier) || (price != null && LEGACY_PRICE_LABELS.has(price))) {
    return PRO_MONTHLY_USD_DISPLAY;
  }
  if (price != null && price.length > 0) {
    return price;
  }
  return PRO_MONTHLY_USD_DISPLAY;
}

/**
 * Load the canonical monthly SKU (Test Store / App Store).
 * RevenueCat may still map `$rc_monthly` to the legacy Test Store id in browser mode.
 */
export async function getMonthlyStoreProduct(): Promise<PurchasesStoreProduct | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }
  try {
    const products = await Purchases.getProducts([...MONTHLY_PRODUCT_IDS]);
    const preferred = products.find((p) => p.identifier === PRO_MONTHLY_STORE_PRODUCT_ID);
    if (preferred != null) {
      return preferred;
    }
    const ios = products.find((p) => p.identifier === PRO_MONTHLY_IOS_PRODUCT_ID);
    if (ios != null) {
      return ios;
    }
    return products[0] ?? null;
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] getProducts failed', err);
    }
    return null;
  }
}

/**
 * Purchase Pro monthly, preferring the $3.99 sku when the package still points at legacy Test Store.
 */
export async function purchaseMonthlySubscription(): Promise<CustomerInfo | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }

  let offerings = null;
  try {
    offerings = await Purchases.getOfferings();
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] getOfferings failed', err);
    }
  }

  const pkg = offerings != null ? pickMonthlyPackage(offerings) : null;
  if (pkg == null) {
    return null;
  }

  // Web (Test Store + Web Billing): package purchase only — purchaseStoreProduct throws.
  if (Platform.OS === 'web') {
    if (isLegacyMonthlyProductId(pkg.product.identifier) && __DEV__) {
      console.warn(
        '[RevenueCat] Test Store is using legacy agreeonatime_pro_monthly ($9.99). ' +
          'Archive that product in RevenueCat and keep agreeonatime_pro_monthly_399.',
      );
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  if (!isLegacyMonthlyProductId(pkg.product.identifier)) {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  const product = await getMonthlyStoreProduct();
  if (product == null || isLegacyMonthlyProductId(product.identifier)) {
    if (__DEV__) {
      console.warn(
        '[RevenueCat] Only legacy Test Store sku is available — archive agreeonatime_pro_monthly in the dashboard',
      );
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  const { customerInfo } = await Purchases.purchaseStoreProduct(product);
  return customerInfo;
}
