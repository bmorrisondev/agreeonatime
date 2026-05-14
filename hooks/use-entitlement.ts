/**
 * v1.0 stub — everyone is Pro while the paywall is off.
 *
 * When the paywall is enabled, swap this to check RevenueCat
 * `CustomerInfo.entitlements.active` for the "pro" entitlement.
 */

interface Entitlement {
  readonly isPro: boolean;
}

const PRO_ENTITLEMENT: Entitlement = { isPro: true } as const;

export function useEntitlement(): Entitlement {
  return PRO_ENTITLEMENT;
}
