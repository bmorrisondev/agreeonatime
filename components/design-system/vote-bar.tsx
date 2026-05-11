import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { t } from '@/lib/i18n/t';

export interface DsVoteBarProps {
  readonly yesCount: number;
  readonly noCount: number;
}

export function DsVoteBar({ yesCount, noCount }: DsVoteBarProps): ReactElement {
  const total = Math.max(0, yesCount + noCount);
  const yesRatio = total === 0 ? 0 : yesCount / total;
  const noRatio = total === 0 ? 0 : noCount / total;
  const label = t('ds_voteBar_a11y', { yes: yesCount, no: noCount });

  return (
    <View accessibilityLabel={label} accessibilityRole="none" className="w-full">
      <View className="h-ds-sm w-full flex-row overflow-hidden rounded-ds-pill bg-neutral-200 dark:bg-neutral-700">
        {total === 0 ? (
          <View className="h-full w-full bg-neutral-300 dark:bg-neutral-600" />
        ) : (
          <>
            <View className="h-full bg-emerald-500" style={{ flex: yesRatio }} />
            <View className="h-full bg-neutral-400 dark:bg-neutral-500" style={{ flex: noRatio }} />
          </>
        )}
      </View>
      <Text allowFontScaling className="mt-ds-xs text-caption text-neutral-700 dark:text-neutral-300" maxFontSizeMultiplier={2}>
        {t('ds_voteBar_caption', { yes: yesCount, no: noCount })}
      </Text>
    </View>
  );
}
