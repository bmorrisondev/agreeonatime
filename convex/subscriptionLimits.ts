/** RevenueCat entitlement identifier — must match the dashboard and `lib/purchases/constants.ts`. */
export const PRO_ENTITLEMENT_ID = 'pro';

/** Product ids that should grant Pro (keep in sync with `lib/purchases/constants.ts`). */
export const PRO_PRODUCT_IDS = [
  'agreeonatime_pro_monthly_399',
  'agreeonatime_pro_monthly',
  'me.brianmm.agreeonatime.pro.monthly',
] as const;

const PRO_PRODUCT_ID_SET = new Set<string>(PRO_PRODUCT_IDS);

export function isProProductId(productId: string | undefined | null): boolean {
  if (productId == null || productId.length === 0) {
    return false;
  }
  return PRO_PRODUCT_ID_SET.has(productId);
}
