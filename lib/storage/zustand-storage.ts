import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

function createMemoryStorage(): StateStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (name: string): string | null => memory.get(name) ?? null,
    setItem: (name: string, value: string): void => {
      memory.set(name, value);
    },
    removeItem: (name: string): void => {
      memory.delete(name);
    },
  };
}

let mmkvInstance: ReturnType<typeof import('react-native-mmkv').createMMKV> | null = null;

function getMmkv(): ReturnType<typeof import('react-native-mmkv').createMMKV> {
  if (mmkvInstance === null) {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    mmkvInstance = createMMKV({ id: 'agreeonatime' });
  }
  return mmkvInstance;
}

function createMmkvStorage(): StateStorage {
  return {
    getItem: (name: string): string | null => getMmkv().getString(name) ?? null,
    setItem: (name: string, value: string): void => {
      getMmkv().set(name, value);
    },
    removeItem: (name: string): void => {
      getMmkv().remove(name);
    },
  };
}

function resolveStorage(): StateStorage {
  if (Platform.OS === 'web') {
    return {
      getItem: (name: string): string | null =>
        typeof localStorage === 'undefined' ? null : localStorage.getItem(name),
      setItem: (name: string, value: string): void => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(name, value);
        }
      },
      removeItem: (name: string): void => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(name);
        }
      },
    };
  }

  // MMKV is not linked in Expo Go; use in-memory storage until a dev client build.
  if (Constants.expoGoConfig != null) {
    return createMemoryStorage();
  }

  return createMmkvStorage();
}

/**
 * Sync persistence for Zustand: MMKV on native dev/production builds, localStorage on web,
 * in-memory when running inside Expo Go.
 */
export const zustandStorage: StateStorage = resolveStorage();
