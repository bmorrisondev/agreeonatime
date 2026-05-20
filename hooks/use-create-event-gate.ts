import { useCallback, useState } from 'react';

import { useSubscription } from '@/hooks/use-subscription';

export interface CreateEventGate {
  readonly paywallVisible: boolean;
  readonly closePaywall: () => void;
  readonly openPaywall: () => void;
  /** Navigate to create only when allowed; otherwise opens paywall. */
  readonly requestCreate: (navigate: () => void) => void;
  readonly subscription: ReturnType<typeof useSubscription>;
}

export function useCreateEventGate(): CreateEventGate {
  const subscription = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const openPaywall = useCallback(() => {
    setPaywallVisible(true);
  }, []);

  const requestCreate = useCallback(
    (navigate: () => void) => {
      if (!subscription.isLoaded) {
        return;
      }
      if (subscription.canCreateMore) {
        navigate();
        return;
      }
      setPaywallVisible(true);
    },
    [subscription.canCreateMore, subscription.isLoaded],
  );

  return {
    paywallVisible,
    closePaywall,
    openPaywall,
    requestCreate,
    subscription,
  };
}
