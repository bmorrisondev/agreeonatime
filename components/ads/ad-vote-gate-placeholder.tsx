import type { ReactElement } from 'react';
import { Platform, Text, View } from 'react-native';

import { AD_ACCESSIBILITY_LABEL } from '@/lib/ads/constants';

export interface AdVoteGatePlaceholderProps {
  readonly ownerHasActiveSub: boolean;
}

/**
 * Dev stand-in when AdMob SDK is not installed (DEV-454 falls back here in __DEV__).
 */
export function AdVoteGatePlaceholder({
  ownerHasActiveSub,
}: AdVoteGatePlaceholderProps): ReactElement | null {
  if (Platform.OS !== 'web' || !__DEV__ || ownerHasActiveSub) {
    return null;
  }

  return (
    <View
      accessibilityLabel={AD_ACCESSIBILITY_LABEL}
      accessibilityRole="text"
      className="mt-8 min-h-[90px] items-center justify-center rounded-xl border border-dashed border-neutral-400 bg-neutral-100 px-4 py-6 dark:border-neutral-600 dark:bg-neutral-900"
    >
      <Text className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Advertisement
      </Text>
      <Text className="mt-1 text-center text-sm text-neutral-600 dark:text-neutral-300">
        Placeholder — shown when the event host is not on Agree+.
      </Text>
    </View>
  );
}
