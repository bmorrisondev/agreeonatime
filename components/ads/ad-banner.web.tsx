import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AdSenseUnit } from '@/components/ads/adsense-unit.web';
import { AdWebPlaceholder } from '@/components/ads/ad-web-placeholder';
import type { AdBannerProps } from '@/components/ads/ad-banner';
import { useAdEligibility } from '@/hooks/use-ad-eligibility';
import {
  getAdSenseClientId,
  getAdSenseSlotForPlacement,
  hasAdSenseConfigForPlacement,
  shouldShowWebAdPlaceholder,
} from '@/lib/ads/adsense-keys';
import { AD_ACCESSIBILITY_LABEL } from '@/lib/ads/constants';
import { shouldLogAdMobDiagnostics } from '@/lib/ads/log-diagnostics';

/** Web app + vote page — AdSense display ads, owner/sub gate (DEV-454 / web). */
export function AdBanner({
  placement,
  voterMode,
  ownerHasActiveSub,
}: AdBannerProps): ReactElement | null {
  const { showAds, loading } = useAdEligibility({ voterMode, ownerHasActiveSub });
  const clientId = getAdSenseClientId();
  const slotId = getAdSenseSlotForPlacement(placement);
  const configured = hasAdSenseConfigForPlacement(placement);

  useEffect(() => {
    if (!shouldLogAdMobDiagnostics()) {
      return;
    }
    console.info('[AdSense] banner gate', {
      placement,
      showAds,
      loading,
      configured,
      voterMode: voterMode === true,
    });
  }, [placement, showAds, loading, configured, voterMode]);

  if (loading || !showAds) {
    return null;
  }

  if (!configured || clientId == null || slotId == null) {
    if (shouldShowWebAdPlaceholder()) {
      return <AdWebPlaceholder placement={placement} />;
    }
    return null;
  }

  return (
    <View
      accessibilityLabel={AD_ACCESSIBILITY_LABEL}
      accessibilityRole="text"
      className="mt-6 items-center border-t border-neutral-200 bg-neutral-50 py-2 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <AdSenseUnit clientId={clientId} slotId={slotId} placementLabel={placement} />
    </View>
  );
}
