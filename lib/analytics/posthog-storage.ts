import Constants from 'expo-constants';
import { Platform } from 'react-native';

type SyncKeyValueStore = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
};

function memoryStorage(): SyncKeyValueStore {
  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
}

function mmkvStorage(): SyncKeyValueStore {
  const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
  const mmkv = createMMKV({ id: 'posthog-sdk' });
  return {
    getItem: (key: string) => mmkv.getString(key) ?? null,
    setItem: (key: string, value: string) => {
      mmkv.set(key, value);
    },
  };
}

/**
 * PostHog persistence: MMKV on native dev/prod builds; in-memory in Expo Go (MMKV not linked).
 * Web is handled by skipping `PostHogProvider` entirely.
 */
export function createPosthogCustomStorage(): SyncKeyValueStore {
  if (Platform.OS === 'web') {
    return memoryStorage();
  }
  if (Constants.expoGoConfig != null) {
    return memoryStorage();
  }
  return mmkvStorage();
}
