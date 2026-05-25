import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { Platform } from 'react-native';

import { shouldLogAdMobDiagnostics } from '@/lib/ads/log-diagnostics';

/**
 * Requests App Tracking Transparency on iOS when still undetermined.
 */
export async function requestAdTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    const current = await getTrackingPermissionsAsync();
    if (shouldLogAdMobDiagnostics()) {
      console.info('[AdMob] ATT status before request:', current.status);
    }
    if (current.status !== 'undetermined') {
      if (shouldLogAdMobDiagnostics()) {
        console.info('[AdMob] ATT skipped — already', current.status);
      }
      return;
    }
    const result = await requestTrackingPermissionsAsync();
    if (shouldLogAdMobDiagnostics()) {
      console.info('[AdMob] ATT status after request:', result.status);
    }
  } catch (error: unknown) {
    console.warn('[AdMob] requestTrackingPermissionsAsync failed', error);
  }
}
