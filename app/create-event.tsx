import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

/**
 * Placeholder until create-event flow ships (DEV-385).
 */
export default function CreateEventScreen(): ReactElement {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
      <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Create event
      </Text>
      <Text className="mt-3 text-center text-base text-neutral-600 dark:text-neutral-400">
        The full create-event form and Convex mutation will ship in DEV-385.
      </Text>
    </View>
  );
}
