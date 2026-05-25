import type { ReactElement } from 'react';
import { Platform, Text, View } from 'react-native';

import type { AdPlacementId } from '@/lib/ads/constants';
import { AD_ACCESSIBILITY_LABEL } from '@/lib/ads/constants';

export interface AdWebPlaceholderProps {
  readonly placement: AdPlacementId;
}

/** Dev/preview stand-in when AdSense client or slot env is missing. */
export function AdWebPlaceholder({ placement }: AdWebPlaceholderProps): ReactElement | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      accessibilityLabel={AD_ACCESSIBILITY_LABEL}
      accessibilityRole="text"
      className="mt-6 min-h-[90px] items-center justify-center rounded-xl border border-dashed border-neutral-400 bg-neutral-100 px-4 py-6 dark:border-neutral-600 dark:bg-neutral-900"
    >
      <Text className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Advertisement
      </Text>
      <Text className="mt-1 text-center text-sm text-neutral-600 dark:text-neutral-300">
        AdSense placeholder ({placement}) — set EXPO_PUBLIC_ADSENSE_CLIENT_ID and slot env vars.
      </Text>
    </View>
  );
}
