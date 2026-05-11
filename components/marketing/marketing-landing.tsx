import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { isConvexConfigured } from '@/lib/convex/client';

export function MarketingLanding(): ReactElement {
  const convexReady = isConvexConfigured();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1 px-5 pb-12 pt-4" keyboardShouldPersistTaps="handled">
        <Text
          accessibilityRole="header"
          className="text-4xl font-bold text-neutral-900 dark:text-neutral-50"
        >
          Agree on a Time
        </Text>
        <Text className="mt-3 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
          Propose a few times, let the group vote yes or no, and pick the winner — without the endless
          thread.
        </Text>

        {convexReady ? (
          <Pressable
            accessibilityLabel="Sign in to your account"
            accessibilityRole="button"
            className="mt-8 self-start rounded-xl bg-[#FF6B5C] px-6 py-4 active:opacity-90"
            onPress={() => {
              router.push('/sign-in');
            }}
          >
            <Text className="text-center text-base font-semibold text-white">Sign in</Text>
          </Pressable>
        ) : (
          <Text className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            Configure EXPO_PUBLIC_CONVEX_URL and related env vars to enable sign-in for this build.
          </Text>
        )}

        <Text
          accessibilityRole="header"
          className="mb-3 mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100"
        >
          How it works
        </Text>
        <View className="gap-6">
          <View>
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              1. Create a poll
            </Text>
            <Text className="mt-1 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Add two or more proposed times and a voting deadline.
            </Text>
          </View>
          <View>
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              2. Share the link
            </Text>
            <Text className="mt-1 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Invitees vote from their phone or the web — no account required to respond.
            </Text>
          </View>
          <View>
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              3. Lock the time
            </Text>
            <Text className="mt-1 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              See which slot won, confirm, and let everyone know it is decided.
            </Text>
          </View>
        </View>

        <View className="mt-12 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <Text className="text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
            Get it on the App Store
          </Text>
          <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Badge and store link ship with the public TestFlight / App Store release.
          </Text>
        </View>

        <MarketingFooter />
      </ScrollView>
    </SafeAreaView>
  );
}
