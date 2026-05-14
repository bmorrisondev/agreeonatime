import { Platform } from 'react-native';

const STORAGE_SESSION = 'agreeonatime_guest_session_v1';
const STORAGE_NAME = 'agreeonatime_guest_name_v1';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateGuestSessionId(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    let existing = window.localStorage.getItem(STORAGE_SESSION);
    if (existing == null || existing.length < 16) {
      existing = randomHex(24);
      window.localStorage.setItem(STORAGE_SESSION, existing);
    }
    return existing;
  }
  return randomHex(24);
}

export function getStoredGuestName(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(STORAGE_NAME)?.trim() ?? '';
  }
  return '';
}

export function setStoredGuestName(name: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_NAME, name.trim());
  }
}
