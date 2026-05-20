/** RevenueCat entitlement id — must match the RevenueCat dashboard and Convex. */
export const PRO_ENTITLEMENT_ID = 'pro';

/**
 * Pro monthly price in USD (App Store US tier).
 * Web Billing (Stripe) and Test Store should match this amount.
 */
export const PRO_MONTHLY_USD_AMOUNT_MICROS = 3_990_000;

/** Human-readable USD price for docs and dashboard setup. */
export const PRO_MONTHLY_USD_DISPLAY = '$3.99';

/** Test Store + Web Billing product id (current $3.99 tier). */
export const PRO_MONTHLY_STORE_PRODUCT_ID = 'agreeonatime_pro_monthly_399';

/** Retired Test Store sku at $9.99 — archive in RevenueCat when possible. */
export const LEGACY_TEST_STORE_PRODUCT_ID = 'agreeonatime_pro_monthly';

/** App Store product id. */
export const PRO_MONTHLY_IOS_PRODUCT_ID = 'me.brianmm.agreeonatime.pro.monthly';

/** All product ids that grant the {@link PRO_ENTITLEMENT_ID} entitlement. */
export const PRO_PRODUCT_IDS = [
  PRO_MONTHLY_STORE_PRODUCT_ID,
  LEGACY_TEST_STORE_PRODUCT_ID,
  PRO_MONTHLY_IOS_PRODUCT_ID,
] as const;
