import { Platform } from 'react-native';

/** Platforms where the Google Mobile Ads native SDK is used. */
export function supportsAdMobPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
