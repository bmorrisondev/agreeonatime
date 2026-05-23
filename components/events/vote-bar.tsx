import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { t } from '@/lib/i18n/t';

export function VoteBar(props: {
  yesCount: number;
  noCount: number;
  accessibilityLabel: string;
}): ReactElement {
  const { yesCount, noCount, accessibilityLabel } = props;
  const total = yesCount + noCount;
  if (total === 0) {
    return (
      <View
        accessibilityLabel={`${accessibilityLabel}. ${t('a11y_no_votes_yet')}`}
        accessibilityRole="text"
      >
        <Text allowFontScaling className="text-sm text-neutral-500 dark:text-neutral-400" maxFontSizeMultiplier={2}>
          {t('a11y_no_votes_yet')}
        </Text>
      </View>
    );
  }
  const yesPct = (yesCount / total) * 100;
  const noPct = (noCount / total) * 100;
  const caption = t('ds_voteBar_caption', { yes: yesCount, no: noCount });
  const fullLabel = `${accessibilityLabel}. ${t('ds_voteBar_a11y', { yes: yesCount, no: noCount })}`;
  return (
    <View accessibilityLabel={fullLabel} accessibilityRole="none">
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-2 w-full flex-row overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
      >
        <View className="h-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${yesPct}%` }} />
        <View className="h-full bg-rose-400 dark:bg-rose-500" style={{ width: `${noPct}%` }} />
      </View>
      <Text
        allowFontScaling
        accessibilityElementsHidden
        className="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
        importantForAccessibility="no-hide-descendants"
        maxFontSizeMultiplier={2}
      >
        {caption}
      </Text>
    </View>
  );
}
