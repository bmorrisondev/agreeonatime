import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { AppState, InteractionManager } from 'react-native';

import { configureAds, requestAdTrackingPermission, supportsAdMobPlatform } from '@/lib/ads';

async function waitForActiveApp(): Promise<void> {
  if (AppState.currentState === 'active') {
    return;
  }
  await new Promise<void>((resolve) => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        subscription.remove();
        resolve();
      }
    });
  });
}

/** Wait until splash transitions finish — iOS suppresses ATT while inactive. */
async function waitUntilReadyForAtt(): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve();
    });
  });
  await waitForActiveApp();
  // Brief pause so the home screen is visible before the system dialog.
  await new Promise((resolve) => {
    setTimeout(resolve, 600);
  });
}

/**
 * Requests ATT (iOS) then initialises Google Mobile Ads (DEV-451).
 * ATT is deferred until after splash/interactions so iOS will show the prompt.
 */
export function AdMobInit(): ReactElement | null {
  useEffect(() => {
    if (!supportsAdMobPlatform()) {
      return;
    }

    void (async () => {
      await waitUntilReadyForAtt();
      await requestAdTrackingPermission();
      await configureAds();
    })();
  }, []);

  return null;
}
