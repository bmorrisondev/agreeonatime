import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { Platform } from 'react-native';

function shouldLogAttDiagnostics(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';
}

/**
 * Requests App Tracking Transparency on iOS when still undetermined.
 */
export async function requestAdTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    const current = await getTrackingPermissionsAsync();
    if (shouldLogAttDiagnostics()) {
      console.info('[AdMob] ATT status before request:', current.status);
    }
    if (current.status !== 'undetermined') {
      return;
    }
    const result = await requestTrackingPermissionsAsync();
    if (shouldLogAttDiagnostics()) {
      console.info('[AdMob] ATT status after request:', result.status);
    }
  } catch (error: unknown) {
    console.warn('[AdMob] requestTrackingPermissionsAsync failed', error);
  }
}
