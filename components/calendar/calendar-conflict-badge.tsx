import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

export interface CalendarConflictBadgeProps {
  readonly visible: boolean;
}

export function CalendarConflictBadge(props: CalendarConflictBadgeProps): ReactElement | null {
  if (!props.visible) {
    return null;
  }

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="You have something at this time"
      className="mt-1 self-start rounded-md bg-amber-100 px-2 py-1 dark:bg-amber-950/60"
    >
      <Text className="text-xs font-medium text-amber-900 dark:text-amber-200">
        You have something at this time
      </Text>
    </View>
  );
}
