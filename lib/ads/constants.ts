/**
 * Logical placement ids — map to env ad unit ids via {@link getAdUnitIdForPlacement}.
 * @see DEV-453, DEV-454
 */
export const AD_PLACEMENT_IDS = {
  eventListBanner: 'event_list_banner',
  eventDetailBanner: 'event_detail_banner',
  postConfirmInterstitial: 'post_confirm_interstitial',
  webVoteBanner: 'web_vote_banner',
} as const;

export type AdPlacementId = (typeof AD_PLACEMENT_IDS)[keyof typeof AD_PLACEMENT_IDS];

/** VoiceOver / accessibility — wrap native ad views (DEV-453 / DEV-454). */
export const AD_ACCESSIBILITY_LABEL = 'Advertisement';

/**
 * Google sample ad units for development (official test publisher).
 * @see https://developers.google.com/admob/ios/test-ads
 */
export const GOOGLE_TEST_AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

export const GOOGLE_TEST_APP_IDS = {
  ios: 'ca-app-pub-3940256099942544~1458002511',
  android: 'ca-app-pub-3940256099942544~3347511713',
} as const;
