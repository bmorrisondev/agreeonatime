import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Guest vote landing (share link target). Full voting UI is a separate ticket.
 */
export default function VoteByTokenScreen(): ReactElement {
  const raw = useLocalSearchParams<{ token: string }>().token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const preview =
    token != null && token.length > 0 ? `${token.slice(0, 6)}…${token.slice(-4)}` : 'this event';

  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
      <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Vote on a time
      </Text>
      <Text className="mt-3 text-center text-base text-neutral-600 dark:text-neutral-400">
        Link for {preview}. Voting for invitees will open from this page in a future update.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to home"
        className="mt-8 rounded-lg bg-[#FF6B5C] px-5 py-2.5 active:opacity-90"
        onPress={() => {
          router.replace('/');
        }}
      >
        <Text className="text-sm font-semibold text-white">Go to home</Text>
      </Pressable>
    </View>
  );
}
