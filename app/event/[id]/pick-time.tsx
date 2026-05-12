import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Owner flow to finalize a time (DEV-388). Placeholder route linked from event detail.
 */
export default function PickTimeScreen(): ReactElement {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  return (
    <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
      <Text className="text-base text-neutral-700 dark:text-neutral-300">
        Auto-suggest and confirm flow ships in DEV-388. For now, gather votes from invitees and return here when
        ready.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to event"
        className="mt-6 self-start rounded-lg bg-neutral-200 px-4 py-2.5 dark:bg-neutral-800"
        onPress={() => {
          if (id != null && id.length > 0) {
            router.replace(`/event/${id}`);
          } else {
            router.back();
          }
        }}
      >
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Back to event</Text>
      </Pressable>
    </View>
  );
}
