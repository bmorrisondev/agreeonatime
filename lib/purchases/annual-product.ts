import Purchases, {
  type CustomerInfo,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import {
  PRO_ANNUAL_IOS_PRODUCT_ID,
  PRO_ANNUAL_STORE_PRODUCT_ID,
  PRO_ANNUAL_USD_DISPLAY,
} from '@/lib/purchases/constants';
import { pickAnnualPackage } from '@/lib/purchases/package-selection';
import { isPurchasesConfigured } from '@/lib/purchases/configured-state';
import { supportsPurchasesPlatform } from '@/lib/purchases/platform';

const ANNUAL_PRODUCT_IDS = [PRO_ANNUAL_STORE_PRODUCT_ID, PRO_ANNUAL_IOS_PRODUCT_ID] as const;

export function getAnnualStoreProductPriceLabel(product: PurchasesStoreProduct | null): string | null {
  if (product == null) {
    return null;
  }
  const price = product.priceString?.trim();
  if (price != null && price.length > 0) {
    return price;
  }
  return PRO_ANNUAL_USD_DISPLAY;
}

/**
 * Load the canonical annual SKU (Test Store / App Store).
 */
export async function getAnnualStoreProduct(): Promise<PurchasesStoreProduct | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }
  try {
    const products = await Purchases.getProducts([...ANNUAL_PRODUCT_IDS]);
    const preferred = products.find((p) => p.identifier === PRO_ANNUAL_STORE_PRODUCT_ID);
    if (preferred != null) {
      return preferred;
    }
    const ios = products.find((p) => p.identifier === PRO_ANNUAL_IOS_PRODUCT_ID);
    if (ios != null) {
      return ios;
    }
    return products[0] ?? null;
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] getProducts (annual) failed', err);
    }
    return null;
  }
}

/** Purchase Pro annual via the current offering package. */
export async function purchaseAnnualSubscription(): Promise<CustomerInfo | null> {
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

  const pkg = offerings != null ? pickAnnualPackage(offerings) : null;
  if (pkg == null) {
    return null;
  }

  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}
