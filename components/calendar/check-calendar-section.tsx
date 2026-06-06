import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { CalendarConflictStatus } from '@/hooks/use-calendar-conflicts';

export interface CheckCalendarSectionProps {
  readonly status: CalendarConflictStatus;
  readonly errorMessage: string | null;
  readonly disabled: boolean;
  readonly onPressCheck: () => void;
}

function statusMessage(status: CalendarConflictStatus, errorMessage: string | null): string | null {
  switch (status) {
    case 'unsupported':
      return 'Calendar conflict check is available on iOS with Apple Calendar.';
    case 'denied':
      return 'Calendar access was denied. You can enable it in Settings to see conflicts.';
    case 'no_calendars':
      return 'No Apple calendars found on this device.';
    case 'error':
      return errorMessage;
    default:
      return null;
  }
}

export function CheckCalendarSection(props: CheckCalendarSectionProps): ReactElement {
  const { status, errorMessage, disabled, onPressCheck } = props;
  const message = statusMessage(status, errorMessage);
  const loading = status === 'loading';

  return (
    <View className="mb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Checking calendar' : 'Check my calendar for conflicts'}
        accessibilityState={{ disabled: disabled || loading }}
        className="self-start flex-row items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600"
        disabled={disabled || loading}
        onPress={() => {
          void onPressCheck();
        }}
      >
        {loading ? <ActivityIndicator size="small" /> : null}
        <View>
          <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {loading ? 'Checking calendar…' : 'Check my calendar'}
          </Text>
          <Text className="text-[10px] text-neutral-500">Agree+ · stays on your device</Text>
        </View>
      </Pressable>

      {message != null ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-2 text-xs text-neutral-500 dark:text-neutral-400"
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
