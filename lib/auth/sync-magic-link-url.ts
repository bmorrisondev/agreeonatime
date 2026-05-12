/**
 * Runs before the first React render (import side effect in `app/_layout.tsx`).
 * Expo Router matches routes during initial render; `useLayoutEffect` is too late if the URL is
 * already a bogus path like `/nEmail?ott=…` or `/sign-in/nEmail?ott=…` (broken magic-link redirect / email client).
 */
export function syncNormalizeMagicLinkLandingUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const url = new URL(window.location.href);
    const ott = url.searchParams.get('ott');
    let path = url.pathname;

    // `/sign-in/nEmail?ott=…` — relative `nEmail` resolved under `/sign-in`; collapse before route match.
    if (path.startsWith('/sign-in/')) {
      url.pathname = '/sign-in';
      path = '/sign-in';
      window.history.replaceState(null, '', url.toString());
    }

    if (ott != null && ott.length > 0) {
      if (path !== '/' && path !== '/sign-in') {
        url.pathname = '/sign-in';
        window.history.replaceState(null, '', url.toString());
      }
      return;
    }

    // After Better Auth strips `ott`, we can still be stuck on a typo path with no matching route.
    if (path === '/nEmail' || path === '/email' || path === '/Email') {
      url.pathname = '/sign-in';
      url.search = '';
      window.history.replaceState(null, '', url.toString());
    }
  } catch {
    // ignore malformed URLs
  }
}
