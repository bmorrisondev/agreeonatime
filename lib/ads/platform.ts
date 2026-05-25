import { Platform } from 'react-native';

/** Platforms where AdMob is supported in v1.1 (Android deferred). */
export function supportsAdsPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'web';
}

/** Native SDK surfaces (DEV-451 init + ATT). */
export function supportsAdMobPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
