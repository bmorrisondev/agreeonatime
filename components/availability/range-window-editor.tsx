import type { ReactElement } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatDateTimeMs } from '@/lib/events/format-event-home';
import type { RangeWindow } from '@/lib/availability/grid';
import { WebDatetimeLocalInput } from '@/lib/events/web-datetime-local';

export interface RangeWindowEditorProps {
  readonly windows: readonly RangeWindow[];
  readonly disabled?: boolean;
  readonly colorScheme: 'light' | 'dark';
  readonly onChangeWindow: (index: number, window: RangeWindow) => void;
  readonly onAddWindow: () => void;
  readonly onRemoveWindow: (index: number) => void;
}

export function RangeWindowEditor({
  windows,
  disabled = false,
  colorScheme,
  onChangeWindow,
  onAddWindow,
  onRemoveWindow,
}: RangeWindowEditorProps): ReactElement {
  return (
    <View>
      <Text className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        Add one or more windows (e.g. Saturday and Sunday). Invitees mark 30-minute blocks they are free.
      </Text>
      {windows.map((w, index) => (
        <View key={`range-win-${String(index)}`} className="mb-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <Text className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Window {index + 1}
          </Text>
          {Platform.OS === 'web' ? (
            <View className="gap-2">
              <WebDatetimeLocalInput
                accessibilityLabel={`Window ${String(index + 1)} start`}
                colorScheme={colorScheme}
                disabled={disabled}
                valueMs={w.startBound}
                onChangeMs={(startBound) => {
                  onChangeWindow(index, { startBound, endBound: w.endBound });
                }}
              />
              <WebDatetimeLocalInput
                accessibilityLabel={`Window ${String(index + 1)} end`}
                colorScheme={colorScheme}
                disabled={disabled}
                valueMs={w.endBound}
                onChangeMs={(endBound) => {
                  onChangeWindow(index, { startBound: w.startBound, endBound });
                }}
              />
            </View>
          ) : (
            <View className="gap-1">
              <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                Start: {formatDateTimeMs(w.startBound)}
              </Text>
              <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                End: {formatDateTimeMs(w.endBound)}
              </Text>
              <Text className="text-xs text-neutral-500">Edit range windows on web for full date controls.</Text>
            </View>
          )}
          {windows.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove window ${String(index + 1)}`}
              className="mt-2 self-start rounded border border-neutral-300 px-3 py-2 dark:border-neutral-600"
              disabled={disabled}
              onPress={() => {
                onRemoveWindow(index);
              }}
            >
              <Text className="text-sm text-neutral-700 dark:text-neutral-300">Remove window</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add availability window"
        className="self-start rounded-lg border border-dashed border-neutral-400 px-3 py-2 dark:border-neutral-500"
        disabled={disabled}
        onPress={onAddWindow}
      >
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">+ Add window</Text>
      </Pressable>
    </View>
  );
}
