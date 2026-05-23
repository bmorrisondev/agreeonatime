import { makeFunctionReference } from 'convex/server';
import { useQuery } from 'convex/react';

import { useEntitlement } from '@/hooks/use-entitlement';
import { FREE_MAX_ACTIVE_OPEN_EVENTS } from '@/lib/subscription/free-tier';

const getCreateEligibilityQuery = makeFunctionReference<'query'>('subscriptions:getCreateEligibility');

export interface SubscriptionState {
  readonly isPro: boolean;
  readonly isLoaded: boolean;
  readonly canCreateMore: boolean;
  readonly activeOpenCount: number;
  readonly maxActiveEvents: number | null;
  /** Convex deployment allows dev Pro override (Settings toggle). */
  readonly devProOverrideAvailable: boolean;
  readonly devProOverride: boolean;
}

/**
 * Combines Convex-backed entitlement (all platforms) with RevenueCat SDK state on iOS/web.
 */
export function useSubscription(): SubscriptionState {
  const eligibility = useQuery(getCreateEligibilityQuery);
  const { isPro: rcPro, isLoaded: rcLoaded } = useEntitlement();

  const serverLoaded = eligibility !== undefined;
  const isLoaded = serverLoaded && rcLoaded;

  const serverPro = eligibility?.isPro ?? false;
  const isPro = serverPro || rcPro;
  const canCreateMore = eligibility?.canCreateMore ?? isPro;
  const activeOpenCount = eligibility?.activeOpenCount ?? 0;
  const maxActiveEvents = eligibility?.maxActiveEvents ?? (isPro ? null : FREE_MAX_ACTIVE_OPEN_EVENTS);
  const devProOverrideAvailable = eligibility?.devProOverrideAvailable ?? false;
  const devProOverride = eligibility?.devProOverride ?? false;

  return {
    isPro,
    isLoaded,
    canCreateMore,
    activeOpenCount,
    maxActiveEvents,
    devProOverrideAvailable,
    devProOverride,
  };
}
