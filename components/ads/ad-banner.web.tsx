import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { AdVoteGatePlaceholder } from '@/components/ads/ad-vote-gate-placeholder';
import type { AdBannerProps } from '@/components/ads/ad-banner';
import { useAdEligibility } from '@/hooks/use-ad-eligibility';
import { getAdUnitIdForPlacement } from '@/lib/ads/admob-keys';
import { loadBannerAdSdk } from '@/lib/ads/banner-ad-sdk';
import { AD_ACCESSIBILITY_LABEL } from '@/lib/ads/constants';
import { initializeAds } from '@/lib/ads/initialize';

/** Web vote page banner — owner-sub gate via `voterMode` (DEV-454). */
export function AdBanner({
  placement,
  voterMode,
  ownerHasActiveSub,
}: AdBannerProps): ReactElement | null {
  const { showAds, loading } = useAdEligibility({ voterMode, ownerHasActiveSub });
  const { width } = useWindowDimensions();
  const [adVisible, setAdVisible] = useState(false);
  const [initDone, setInitDone] = useState(false);

  const bannerSdk = useMemo(() => loadBannerAdSdk(), []);
  const unitId = useMemo((): string | undefined => getAdUnitIdForPlacement(placement), [placement]);

  useEffect(() => {
    void initializeAds().finally(() => {
      setInitDone(true);
    });
  }, []);

  useEffect(() => {
    setAdVisible(false);
  }, [placement, showAds]);

  if (loading || !showAds) {
    return null;
  }

  if (initDone && bannerSdk != null && unitId != null) {
    const { BannerAd, BannerAdSize } = bannerSdk;
    return (
      <View
        accessibilityLabel={AD_ACCESSIBILITY_LABEL}
        accessibilityRole="text"
        className="mt-6 items-center border-t border-neutral-200 bg-neutral-50 py-2 dark:border-neutral-800 dark:bg-neutral-950"
        importantForAccessibility="yes"
        style={adVisible ? undefined : { height: 0, overflow: 'hidden', opacity: 0 }}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <BannerAd
            unitId={unitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            width={width}
            onAdLoaded={() => {
              setAdVisible(true);
            }}
            onAdFailedToLoad={() => {
              setAdVisible(false);
            }}
          />
        </View>
      </View>
    );
  }

  if (__DEV__ && voterMode) {
    return <AdVoteGatePlaceholder ownerHasActiveSub={false} />;
  }

  return null;
}
