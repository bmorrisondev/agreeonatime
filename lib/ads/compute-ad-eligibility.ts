export interface AdEligibilityResult {
  readonly showAds: boolean;
  readonly loading: boolean;
}

/**
 * Derives ad visibility from entitlement state.
 * While loading, ads stay hidden so components do not mount prematurely.
 */
export function computeAdEligibility(
  hasActiveEntitlement: boolean | null,
  loading: boolean,
): AdEligibilityResult {
  if (loading) {
    return { showAds: false, loading: true };
  }
  return { showAds: hasActiveEntitlement !== true, loading: false };
}
