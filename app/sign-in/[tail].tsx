import type { ReactElement } from 'react';
import { Redirect, useGlobalSearchParams } from 'expo-router';

import { buildSearchString } from '@/lib/auth/build-search-string';

/**
 * Redirects `/sign-in/<garbage>` → `/sign-in` preserving query (`ott`, etc.).
 */
export default function SignInTrailingRedirect(): ReactElement {
  const query = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const q = buildSearchString(query);
  return <Redirect href={q.length > 0 ? `/sign-in${q}` : '/sign-in'} />;
}
