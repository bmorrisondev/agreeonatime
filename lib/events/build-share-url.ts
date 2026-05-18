/**
 * Public vote link for invitees (path matches `app/vote/[token].tsx`).
 * Shared links always use the production web app host so invitees open the same URL everywhere.
 */
import { PRODUCTION_WEB_APP_ORIGIN } from '@/lib/constants/app-web-origin';

const APP_WEB_ORIGIN = PRODUCTION_WEB_APP_ORIGIN;

export function buildVoteUrl(shareToken: string): string {
  const encoded = encodeURIComponent(shareToken);
  return `${APP_WEB_ORIGIN}/vote/${encoded}`;
}
