import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { configureAds, requestAdTrackingPermission, supportsAdMobPlatform } from '@/lib/ads';

/**
 * Requests ATT (iOS) then initialises Google Mobile Ads (DEV-451).
 */
export function AdMobInit(): ReactElement | null {
  useEffect(() => {
    if (!supportsAdMobPlatform()) {
      return;
    }

    void (async () => {
      await requestAdTrackingPermission();
      await configureAds();
    })();
  }, []);

  return null;
}
