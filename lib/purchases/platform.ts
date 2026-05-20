import { Platform } from 'react-native';

/** Platforms where RevenueCat purchases are supported in this app. */
export function supportsPurchasesPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'web';
}
