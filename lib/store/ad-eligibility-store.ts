import { create } from 'zustand';

import { computeAdEligibility } from '@/lib/ads/compute-ad-eligibility';
import {
  addCustomerInfoUpdateListener,
  getCustomerInfo,
  isProFromCustomerInfo,
  isPurchasesConfigured,
  supportsPurchasesPlatform,
} from '@/lib/purchases';

interface AdEligibilityState {
  readonly showAds: boolean;
  readonly loading: boolean;
  readonly hasCachedResult: boolean;
  readonly listenerRegistered: boolean;
  applyEntitlement: (hasActiveEntitlement: boolean | null, loading: boolean) => void;
  ensureLoaded: () => Promise<void>;
  registerCustomerInfoListener: () => void;
  reset: () => void;
}

function purchasesUnavailableState(): Pick<AdEligibilityState, 'showAds' | 'loading' | 'hasCachedResult'> {
  return { ...computeAdEligibility(false, false), hasCachedResult: true };
}

function initialState(): Pick<
  AdEligibilityState,
  'showAds' | 'loading' | 'hasCachedResult' | 'listenerRegistered'
> {
  const purchasesReady = supportsPurchasesPlatform() && isPurchasesConfigured();
  if (!purchasesReady) {
    return { ...purchasesUnavailableState(), listenerRegistered: false };
  }
  return { showAds: false, loading: true, hasCachedResult: false, listenerRegistered: false };
}

let fetchPromise: Promise<void> | null = null;

export const useAdEligibilityStore = create<AdEligibilityState>()((set, get) => ({
  ...initialState(),
  applyEntitlement: (hasActiveEntitlement, loading) => {
    set({
      ...computeAdEligibility(hasActiveEntitlement, loading),
      hasCachedResult: !loading,
    });
  },
  ensureLoaded: async () => {
    if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
      set({ ...purchasesUnavailableState(), hasCachedResult: true });
      return;
    }

    if (get().hasCachedResult) {
      return;
    }

    if (fetchPromise != null) {
      await fetchPromise;
      return;
    }

    set(computeAdEligibility(null, true));

    fetchPromise = (async () => {
      try {
        const info = await getCustomerInfo();
        const hasActiveEntitlement = info != null && isProFromCustomerInfo(info);
        set({
          ...computeAdEligibility(hasActiveEntitlement, false),
          hasCachedResult: true,
        });
      } catch {
        set({
          ...computeAdEligibility(false, false),
          hasCachedResult: true,
        });
      } finally {
        fetchPromise = null;
      }
    })();

    await fetchPromise;
  },
  registerCustomerInfoListener: () => {
    if (get().listenerRegistered) {
      return;
    }
    if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
      return;
    }
    addCustomerInfoUpdateListener((info) => {
      const hasActiveEntitlement = isProFromCustomerInfo(info);
      set({
        ...computeAdEligibility(hasActiveEntitlement, false),
        hasCachedResult: true,
      });
    });
    set({ listenerRegistered: true });
  },
  reset: () => {
    fetchPromise = null;
    set({ ...initialState() });
  },
}));
