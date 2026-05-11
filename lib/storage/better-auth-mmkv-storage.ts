import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Minimal key-value store shape required by `@better-auth/expo` `expoClient`.
 * The Expo client wraps this with `storageAdapter` (colon-safe keys).
 */
export interface BetterAuthKeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function createMemoryStorage(): BetterAuthKeyValueStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
}

let mmkvInstance: ReturnType<typeof import('react-native-mmkv').createMMKV> | null = null;

function getMmkv(): ReturnType<typeof import('react-native-mmkv').createMMKV> {
  if (mmkvInstance === null) {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    mmkvInstance = createMMKV({ id: 'better-auth-session' });
  }
  return mmkvInstance;
}

function createMmkvStorage(): BetterAuthKeyValueStorage {
  return {
    getItem: (key: string) => getMmkv().getString(key) ?? null,
    setItem: (key: string, value: string) => {
      getMmkv().set(key, value);
    },
  };
}

/**
 * Persists Better Auth session cookies on device (DEV-382).
 * Uses MMKV in dev client / production builds; in-memory in Expo Go (MMKV not linked).
 */
export function createBetterAuthNativeStorage(): BetterAuthKeyValueStorage {
  if (Platform.OS === 'web') {
    throw new Error('createBetterAuthNativeStorage is only for native platforms');
  }
  if (Constants.expoGoConfig != null) {
    return createMemoryStorage();
  }
  return createMmkvStorage();
}
