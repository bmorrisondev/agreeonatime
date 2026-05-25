import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import type { AdBannerProps } from '@/components/ads/ad-banner';
import { useAdEligibility } from '@/hooks/use-ad-eligibility';
import { getAdUnitIdForPlacement } from '@/lib/ads/admob-keys';
import { loadBannerAdSdk } from '@/lib/ads/banner-ad-sdk';
import { AD_ACCESSIBILITY_LABEL } from '@/lib/ads/constants';
import { initializeAds } from '@/lib/ads/initialize';

import { shouldLogAdMobDiagnostics } from '@/lib/ads/log-diagnostics';

/** iOS app banners — viewer subscription gate via RevenueCat + Convex (DEV-453). */
export function AdBanner({ placement }: AdBannerProps): ReactElement | null {
  const { showAds, loading } = useAdEligibility();
  const { width } = useWindowDimensions();
  const [adVisible, setAdVisible] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
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
    setLoadFailed(false);
  }, [placement, showAds]);

  useEffect(() => {
    if (!shouldLogAdMobDiagnostics()) {
      return;
    }
    console.info('[AdMob] banner gate', {
      placement,
      showAds,
      loading,
      initDone,
      hasSdk: bannerSdk != null,
      unitId: unitId != null ? `${unitId.slice(0, 24)}…` : null,
    });
  }, [placement, showAds, loading, initDone, bannerSdk, unitId]);

  if (loading || !showAds || !initDone || bannerSdk == null || unitId == null) {
    return null;
  }

  const { BannerAd, BannerAdSize } = bannerSdk;

  if (loadFailed && process.env.EXPO_PUBLIC_DEV_TOOLS === 'true') {
    return (
      <View
        accessibilityLabel={AD_ACCESSIBILITY_LABEL}
        accessibilityRole="text"
        className="min-h-[50px] items-center justify-center border-t border-dashed border-amber-400 bg-amber-50 py-3 dark:border-amber-600 dark:bg-amber-950"
      >
        <Text className="text-center text-xs text-amber-800 dark:text-amber-200">
          Ad failed to load — check device logs for [AdMob]
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={AD_ACCESSIBILITY_LABEL}
      accessibilityRole="text"
      className="items-center border-t border-neutral-200 bg-neutral-50 py-2 dark:border-neutral-800 dark:bg-neutral-950"
      importantForAccessibility="yes"
      style={adVisible ? undefined : { minHeight: 50, overflow: 'hidden', opacity: adVisible ? 1 : 0.3 }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          width={width}
          onAdLoaded={() => {
            setAdVisible(true);
            setLoadFailed(false);
            if (shouldLogAdMobDiagnostics()) {
              console.info('[AdMob] banner loaded', { placement });
            }
          }}
          onAdFailedToLoad={(error) => {
            setAdVisible(false);
            setLoadFailed(true);
            console.warn('[AdMob] banner failed to load', { placement, error });
          }}
        />
      </View>
    </View>
  );
}
