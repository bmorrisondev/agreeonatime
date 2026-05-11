import { Platform } from 'react-native';

export function isPosthogNativeConfigured(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  return key != null && key.length > 0;
}

export function getPosthogHost(): string {
  return process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
}
