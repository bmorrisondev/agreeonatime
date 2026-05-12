import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';

import { createBetterAuthNativeStorage } from '@/lib/storage/better-auth-mmkv-storage';

const scheme = Constants.expoConfig?.scheme;
const storagePrefix = typeof scheme === 'string' ? scheme : 'agreeonatime';

const baseURL = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

export const authClient = createAuthClient({
  baseURL: baseURL ?? 'https://placeholder.invalid',
  plugins: [
    convexClient(),
    magicLinkClient(),
    expoClient({
      scheme: storagePrefix,
      storagePrefix,
      storage: createBetterAuthNativeStorage(),
    }),
  ],
});

export function isAuthClientConfigured(): boolean {
  return baseURL != null && baseURL.length > 0 && !baseURL.includes('placeholder');
}
