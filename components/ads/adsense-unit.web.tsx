import type { ReactElement } from 'react';
import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { loadAdSenseScript, pushAdSenseSlot } from '@/lib/ads/load-adsense-script';
import { shouldLogAdMobDiagnostics } from '@/lib/ads/log-diagnostics';

export interface AdSenseUnitProps {
  readonly clientId: string;
  readonly slotId: string;
  readonly placementLabel: string;
}

/**
 * Responsive AdSense display unit (web only).
 * @see https://support.google.com/adsense/answer/9274634
 */
export function AdSenseUnit({
  clientId,
  slotId,
  placementLabel,
}: AdSenseUnitProps): ReactElement {
  const pushedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    pushedRef.current = false;

    void (async () => {
      try {
        await loadAdSenseScript(clientId);
        if (cancelled || pushedRef.current) {
          return;
        }
        pushAdSenseSlot();
        pushedRef.current = true;
        if (shouldLogAdMobDiagnostics()) {
          console.info('[AdSense] slot pushed', { placementLabel, slotId });
        }
      } catch (error: unknown) {
        console.warn('[AdSense] init failed', { placementLabel, error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, slotId, placementLabel]);

  const ins = createElement('ins', {
    className: 'adsbygoogle',
    style: { display: 'block', minHeight: 90, width: '100%' },
    'data-ad-client': clientId,
    'data-ad-slot': slotId,
    'data-ad-format': 'auto',
    'data-full-width-responsive': 'true',
  });

  return <View nativeID={`adsense-${slotId}`}>{ins}</View>;
}
