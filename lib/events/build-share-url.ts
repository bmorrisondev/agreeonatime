/**
 * Public vote link for invitees (path matches `app/vote/[token].tsx`).
 * Shared links always use the production web app host so invitees open the same URL everywhere.
 */
const APP_WEB_ORIGIN = 'https://app.agreeonatime.com';

export function buildVoteUrl(shareToken: string): string {
  const encoded = encodeURIComponent(shareToken);
  return `${APP_WEB_ORIGIN}/vote/${encoded}`;
}
