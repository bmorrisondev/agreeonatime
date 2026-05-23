import { PACKAGE_TYPE, type PurchasesOfferings, type PurchasesPackage } from 'react-native-purchases';

import {
  LEGACY_TEST_STORE_PRODUCT_ID,
  PRO_ANNUAL_IOS_PRODUCT_ID,
  PRO_ANNUAL_STORE_PRODUCT_ID,
  PRO_ANNUAL_USD_DISPLAY,
  PRO_MONTHLY_IOS_PRODUCT_ID,
  PRO_MONTHLY_STORE_PRODUCT_ID,
  PRO_MONTHLY_USD_DISPLAY,
} from '@/lib/purchases/constants';

const MONTHLY_PACKAGE_LOOKUP = '$rc_monthly';
const ANNUAL_PACKAGE_LOOKUP = '$rc_annual';

const LEGACY_PRICE_LABELS = new Set(['$9.99', 'US$9.99', '9,99 $US']);

function pickPackageByProductIds(
  offerings: PurchasesOfferings,
  productIds: readonly string[],
): PurchasesPackage | null {
  const current = offerings.current;
  if (current == null) {
    return null;
  }
  const idSet = new Set(productIds);
  return current.availablePackages.find((pkg) => idSet.has(pkg.product.identifier)) ?? null;
}

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

  const byProduct = pickPackageByProductIds(offerings, [
    PRO_MONTHLY_STORE_PRODUCT_ID,
    PRO_MONTHLY_IOS_PRODUCT_ID,
  ]);
  if (byProduct != null) {
    return byProduct;
  }

  return current.monthly ?? null;
}

/**
 * Prefer the annual package on the current offering.
 */
export function pickAnnualPackage(offerings: PurchasesOfferings): PurchasesPackage | null {
  const current = offerings.current;
  if (current == null) {
    return null;
  }

  const byLookup =
    current.availablePackages.find((pkg) => pkg.identifier === ANNUAL_PACKAGE_LOOKUP) ?? null;
  if (byLookup != null) {
    return byLookup;
  }

  const byType =
    current.availablePackages.find((pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
  if (byType != null) {
    return byType;
  }

  const byProduct = pickPackageByProductIds(offerings, [
    PRO_ANNUAL_STORE_PRODUCT_ID,
    PRO_ANNUAL_IOS_PRODUCT_ID,
  ]);
  if (byProduct != null) {
    return byProduct;
  }

  return current.annual ?? null;
}

/**
 * Customer-facing price for the paywall.
 * Maps stale SDK prices from the retired $9.99 Test Store SKU to the current monthly tier.
 */
export function getPackagePriceLabel(
  pkg: PurchasesPackage | null,
  fallbackDisplay: string = PRO_MONTHLY_USD_DISPLAY,
): string | null {
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

  return fallbackDisplay;
}

/** Annual package price with a static fallback when the SDK omits `priceString`. */
export function getAnnualPackagePriceLabel(pkg: PurchasesPackage | null): string | null {
  return getPackagePriceLabel(pkg, PRO_ANNUAL_USD_DISPLAY);
}
