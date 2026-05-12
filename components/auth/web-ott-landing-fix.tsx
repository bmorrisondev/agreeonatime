import type { ReactElement } from 'react';
import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';

import { syncNormalizeMagicLinkLandingUrl } from '@/lib/auth/sync-magic-link-url';

/**
 * SPA / client navigations: same normalization as the import-time sync in `app/_layout.tsx`.
 */
export function WebOttLandingFix(): ReactElement | null {
  useLayoutEffect(() => {
    if (Platform.OS === 'web') {
      syncNormalizeMagicLinkLandingUrl();
    }
  }, []);

  return null;
}
