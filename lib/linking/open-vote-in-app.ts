import { APP_SCHEME } from '@/lib/constants/native-app-linking';

const REDIRECT_SESSION_PREFIX = 'agreeonatime_vote_app_redirect:';

/** Deep link path handled by Expo Router (`app/vote/[token].tsx`). */
export function buildAppVoteDeepLink(shareToken: string): string {
  const encoded = encodeURIComponent(shareToken.trim());
  return `${APP_SCHEME}://vote/${encoded}`;
}

/** Smart App Banner `app-argument` — in-app route path. */
export function buildVoteAppArgument(shareToken: string): string {
  const encoded = encodeURIComponent(shareToken.trim());
  return `/vote/${encoded}`;
}

export function shouldAttemptWebAppRedirect(shareToken: string): boolean {
  if (typeof sessionStorage === 'undefined') {
    return true;
  }
  return sessionStorage.getItem(`${REDIRECT_SESSION_PREFIX}${shareToken}`) !== '1';
}

export function markWebAppRedirectAttempted(shareToken: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(`${REDIRECT_SESSION_PREFIX}${shareToken}`, '1');
}

/** Navigate to the native app vote screen (custom scheme). */
export function openVoteInInstalledApp(shareToken: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.location.assign(buildAppVoteDeepLink(shareToken));
}
