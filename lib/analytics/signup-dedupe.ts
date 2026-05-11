import Constants from 'expo-constants';
import { Platform } from 'react-native';

let metaMmkv: ReturnType<typeof import('react-native-mmkv').createMMKV> | null | undefined;

function getMetaMmkv(): ReturnType<typeof import('react-native-mmkv').createMMKV> | null {
  if (Platform.OS === 'web' || Constants.expoGoConfig != null) {
    return null;
  }
  if (metaMmkv === undefined) {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    metaMmkv = createMMKV({ id: 'agreeonatime-analytics-meta' });
  }
  return metaMmkv;
}

/**
 * Returns true the first time we should emit `signed_up` for this Convex user
 * (new profile within freshness window), across app restarts when MMKV is available.
 */
export function consumeShouldEmitSignedUp(convexUserId: string, createdAt: number): boolean {
  /** Profiles created within this window after first load count as "new" for `signed_up`. */
  const maxAgeMs = 900_000;
  if (Date.now() - createdAt > maxAgeMs) {
    return false;
  }
  const mmkv = getMetaMmkv();
  if (mmkv == null) {
    return true;
  }
  const key = `signed_up_sent_${convexUserId}`;
  if (mmkv.getBoolean(key)) {
    return false;
  }
  mmkv.set(key, true);
  return true;
}
