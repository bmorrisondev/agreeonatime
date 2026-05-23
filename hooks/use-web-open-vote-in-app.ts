import { useEffect } from 'react';
import { Platform } from 'react-native';

import { isIosSafari } from '@/lib/linking/is-ios-safari';
import {
  markWebAppRedirectAttempted,
  openVoteInInstalledApp,
  shouldAttemptWebAppRedirect,
} from '@/lib/linking/open-vote-in-app';

/**
 * On iOS Safari, attempt to open the installed app for this vote link once per session.
 * Universal Links (AASA) handle most taps from Messages/Mail; this covers in-Safari loads.
 */
export function useWebOpenVoteInApp(shareToken: string | undefined, enabled: boolean): void {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || shareToken == null || shareToken.length < 8) {
      return;
    }
    if (!isIosSafari()) {
      return;
    }
    if (!shouldAttemptWebAppRedirect(shareToken)) {
      return;
    }
    markWebAppRedirectAttempted(shareToken);
    openVoteInInstalledApp(shareToken);
  }, [enabled, shareToken]);
}
