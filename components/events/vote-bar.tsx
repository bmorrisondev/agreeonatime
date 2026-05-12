import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

export function VoteBar(props: {
  yesCount: number;
  noCount: number;
  accessibilityLabel: string;
}): ReactElement {
  const { yesCount, noCount, accessibilityLabel } = props;
  const total = yesCount + noCount;
  if (total === 0) {
    return (
      <View accessibilityLabel={`${accessibilityLabel}. No votes yet`} accessibilityRole="text">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">No votes yet</Text>
      </View>
    );
  }
  const yesPct = (yesCount / total) * 100;
  const noPct = (noCount / total) * 100;
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: yesCount, text: `${yesCount} yes, ${noCount} no` }}
      className="h-2 w-full flex-row overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
    >
      <View className="h-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${yesPct}%` }} />
      <View className="h-full bg-rose-400 dark:bg-rose-500" style={{ width: `${noPct}%` }} />
    </View>
  );
}
