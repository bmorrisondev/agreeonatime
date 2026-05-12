import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';

const scheme = Constants.expoConfig?.scheme;
const storagePrefix = typeof scheme === 'string' ? scheme : 'agreeonatime';

const baseURL = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

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

export const authClient = createAuthClient({
  baseURL: baseURL ?? 'https://placeholder.invalid',
  plugins: [
    convexClient(),
    magicLinkClient(),
    crossDomainClient({
      storage: webSessionStorage(),
      storagePrefix,
    }),
  ],
});

export function isAuthClientConfigured(): boolean {
  return baseURL != null && baseURL.length > 0 && !baseURL.includes('placeholder');
}
