import { Platform } from 'react-native';

/** Platforms where AdMob is supported in v1.1 (Android deferred). */
export function supportsAdsPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'web';
}
