import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const scheme = Constants.expoConfig?.scheme;

const baseURL = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

/**
 * Better Auth client for Expo + Convex (`labs.convex.dev/better-auth` Expo guide).
 * Requires `EXPO_PUBLIC_CONVEX_SITE_URL` (usually `*.convex.site`) after `pnpm convex:dev`.
 */
export const authClient = createAuthClient({
  baseURL: baseURL ?? 'https://placeholder.invalid',
  plugins: [
    convexClient(),
    magicLinkClient(),
    expoClient({
      scheme: typeof scheme === 'string' ? scheme : 'agreeonatime',
      storagePrefix: typeof scheme === 'string' ? scheme : 'agreeonatime',
      storage: SecureStore,
    }),
  ],
});

export function isAuthClientConfigured(): boolean {
  return baseURL != null && baseURL.length > 0 && !baseURL.includes('placeholder');
}
