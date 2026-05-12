import { useMemo } from 'react';

/**
 * RevenueCat-backed entitlement (DEV-393). v1.0: everyone is Pro; flip hook body in v1.1.
 */
export function useEntitlement(): { isPro: boolean; isLoaded: boolean } {
  return useMemo(() => ({ isPro: true, isLoaded: true }), []);
}
