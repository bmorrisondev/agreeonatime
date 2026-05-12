import type { ReactElement } from 'react';
import { Redirect, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';

import { buildSearchString } from '@/lib/auth/build-search-string';

const BROKEN_MAGIC_PATH_SEGMENTS = new Set(['nEmail', 'email', 'Email']);

/**
 * Catches single-segment paths that are not other `app/*.tsx` routes (e.g. `/nEmail` from a broken
 * magic-link redirect). Sends users to `/sign-in` with query preserved so `ott` can be verified.
 */
export default function StraySegmentRedirect(): ReactElement {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const query = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const slugNorm = typeof slug === 'string' ? slug : Array.isArray(slug) ? slug[0] ?? '' : '';
  const ott =
    typeof query.ott === 'string' ? query.ott : Array.isArray(query.ott) ? query.ott[0] : undefined;

  const brokenPath = slugNorm.length > 0 && BROKEN_MAGIC_PATH_SEGMENTS.has(slugNorm);
  const hasOtt = ott != null && ott.length > 0;

  if (hasOtt || brokenPath) {
    const q = buildSearchString(query);
    return <Redirect href={q.length > 0 ? `/sign-in${q}` : '/sign-in'} />;
  }

  return <Redirect href="/" />;
}
