import { PACKAGE_TYPE, type PurchasesOfferings, type PurchasesPackage } from 'react-native-purchases';

import {
  LEGACY_TEST_STORE_PRODUCT_ID,
  PRO_MONTHLY_USD_DISPLAY,
} from '@/lib/purchases/constants';

const MONTHLY_PACKAGE_LOOKUP = '$rc_monthly';

const LEGACY_PRICE_LABELS = new Set(['$9.99', 'US$9.99', '9,99 $US']);

/**
 * Prefer the monthly package on the current offering (not annual/custom).
 */
export function pickMonthlyPackage(offerings: PurchasesOfferings): PurchasesPackage | null {
  const current = offerings.current;
  if (current == null) {
    return null;
  }

  const byLookup =
    current.availablePackages.find((pkg) => pkg.identifier === MONTHLY_PACKAGE_LOOKUP) ?? null;
  if (byLookup != null) {
    return byLookup;
  }

  const byType =
    current.availablePackages.find((pkg) => pkg.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
  if (byType != null) {
    return byType;
  }

  return current.monthly ?? null;
}

/**
 * Customer-facing monthly price for the paywall button.
 * Maps stale SDK prices from the retired $9.99 Test Store SKU to the current tier.
 */
export function getPackagePriceLabel(pkg: PurchasesPackage | null): string | null {
  if (pkg == null) {
    return null;
  }

  const price = pkg.product.priceString?.trim();
  const productId = pkg.product.identifier;

  if (
    productId === LEGACY_TEST_STORE_PRODUCT_ID ||
    (price != null && LEGACY_PRICE_LABELS.has(price))
  ) {
    return PRO_MONTHLY_USD_DISPLAY;
  }

  if (price != null && price.length > 0) {
    return price;
  }

  return PRO_MONTHLY_USD_DISPLAY;
}
