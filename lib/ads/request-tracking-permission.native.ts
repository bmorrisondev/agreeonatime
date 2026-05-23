import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * Requests App Tracking Transparency on iOS when still undetermined.
 */
export async function requestAdTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    const current = await getTrackingPermissionsAsync();
    if (current.status !== 'undetermined') {
      return;
    }
    await requestTrackingPermissionsAsync();
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn('[AdMob] requestTrackingPermissionsAsync failed', error);
    }
  }
}
