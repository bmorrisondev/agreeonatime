import { expoClient } from '@better-auth/expo/client';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { emailOTPClient, magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { createBetterAuthNativeStorage } from '@/lib/storage/better-auth-mmkv-storage';

const scheme = Constants.expoConfig?.scheme;
const storagePrefix = typeof scheme === 'string' ? scheme : 'agreeonatime';

const baseURL = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

/** Session storage for Expo web — `expoClient` must not run on web (it pulls `expo-network`). */
function webSessionStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
} {
  if (typeof window === 'undefined') {
    const memory = new Map<string, string>();
    return {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
  }
  return {
    getItem: (key: string) => window.localStorage.getItem(key),
    setItem: (key: string, value: string) => {
      window.localStorage.setItem(key, value);
    },
  };
}

/**
 * Better Auth client for Expo + Convex (`labs.convex.dev/better-auth` Expo guide).
 * Requires `EXPO_PUBLIC_CONVEX_SITE_URL` (usually `*.convex.site`) after `pnpm convex:dev`.
 *
 * On **web**, use `crossDomainClient` only — `expoClient` loads native-only modules and breaks the bundle.
 */
export const authClient = createAuthClient({
  baseURL: baseURL ?? 'https://placeholder.invalid',
  plugins: [
    convexClient(),
    magicLinkClient(),
    emailOTPClient(),
    ...(Platform.OS === 'web'
      ? [
          crossDomainClient({
            storage: webSessionStorage(),
            storagePrefix,
          }),
        ]
      : [
          expoClient({
            scheme: storagePrefix,
            storagePrefix,
            storage: createBetterAuthNativeStorage(),
          }),
        ]),
  ],
});

export function isAuthClientConfigured(): boolean {
  return baseURL != null && baseURL.length > 0 && !baseURL.includes('placeholder');
}
