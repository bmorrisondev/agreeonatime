/**
 * Subscription gate types and pure resolvers (DEV-450 table).
 * Hook + Convex field: DEV-452. UI: DEV-453 / DEV-454.
 */

/** Viewer context for {@link resolveShowAds}. */
export type AdViewerContext = 'app_owner' | 'app_invitee' | 'web_vote_invitee';

export interface AdEligibilityState {
  readonly showAds: boolean;
  readonly loading: boolean;
}

export interface AppAdGateInput {
  /** Viewer has active RevenueCat pro entitlement. */
  readonly viewerHasActiveSub: boolean;
}

export interface WebVoteAdGateInput {
  /** From Convex event document — owner's subscription (DEV-452). */
  readonly ownerHasActiveSub: boolean;
}

/** App owner or invitee: ads when viewer has no active subscription. */
export function resolveAppShowAds(input: AppAdGateInput): boolean {
  return !input.viewerHasActiveSub;
}

/** Web vote page: ads only when event owner is not subscribed. */
export function resolveWebVoteShowAds(input: WebVoteAdGateInput): boolean {
  return !input.ownerHasActiveSub;
}

export function resolveShowAds(
  context: AdViewerContext,
  input: AppAdGateInput | WebVoteAdGateInput,
): boolean {
  switch (context) {
    case 'app_owner':
    case 'app_invitee':
      return resolveAppShowAds(input as AppAdGateInput);
    case 'web_vote_invitee':
      return resolveWebVoteShowAds(input as WebVoteAdGateInput);
  }
}

/** Conservative default while eligibility is loading — do not mount ads. */
export const AD_ELIGIBILITY_LOADING: AdEligibilityState = {
  showAds: false,
  loading: true,
};

export const AD_ELIGIBILITY_SUPPRESSED: AdEligibilityState = {
  showAds: false,
  loading: false,
};
