import type { AdPlacementId } from '@/lib/ads/constants';
import { AD_PLACEMENT_IDS } from '@/lib/ads/constants';

/** AdSense publisher client id (`ca-pub-…`) — same publisher as AdMob. */
export function getAdSenseClientId(): string | undefined {
  const value =
    process.env.EXPO_PUBLIC_ADSENSE_CLIENT_ID ??
    process.env.EXPO_PUBLIC_ADMOB_WEB_APP_ID;
  return value != null && value.length > 0 ? value : undefined;
}

const PLACEMENT_SLOT_ENV_KEYS: Partial<Record<AdPlacementId, string>> = {
  [AD_PLACEMENT_IDS.webVoteBanner]: 'EXPO_PUBLIC_ADSENSE_WEB_VOTE_SLOT',
  [AD_PLACEMENT_IDS.eventListBanner]: 'EXPO_PUBLIC_ADSENSE_EVENT_LIST_SLOT',
  [AD_PLACEMENT_IDS.eventDetailBanner]: 'EXPO_PUBLIC_ADSENSE_EVENT_DETAIL_SLOT',
};

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value != null && value.length > 0 ? value : undefined;
}

/** AdSense `data-ad-slot` for a placement; falls back to `EXPO_PUBLIC_ADSENSE_DISPLAY_SLOT`. */
export function getAdSenseSlotForPlacement(placement: AdPlacementId): string | undefined {
  const envKey = PLACEMENT_SLOT_ENV_KEYS[placement];
  if (envKey != null) {
    const specific = readEnv(envKey);
    if (specific != null) {
      return specific;
    }
  }
  return readEnv('EXPO_PUBLIC_ADSENSE_DISPLAY_SLOT');
}

export function hasAdSenseConfigForPlacement(placement: AdPlacementId): boolean {
  return getAdSenseClientId() != null && getAdSenseSlotForPlacement(placement) != null;
}

export function shouldShowWebAdPlaceholder(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';
}
