import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * Public vote link for invitees (path matches `app/vote/[token].tsx`).
 * On web, prefer same-origin URL when running in a browser.
 */
export function buildVoteUrl(shareToken: string): string {
  const path = `vote/${shareToken}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/${path}`;
  }
  return Linking.createURL(path);
}
