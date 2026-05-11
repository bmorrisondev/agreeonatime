import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { marketingSupportEmail } from '@/lib/marketing/constants';

export function MarketingFooter(): ReactElement {
  return (
    <View className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800">
      <Text
        accessibilityRole="header"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
      >
        Legal & help
      </Text>
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        <Link
          accessibilityLabel="Privacy policy"
          accessibilityRole="link"
          className="text-base font-medium text-[#FF6B5C]"
          href="/privacy"
        >
          Privacy
        </Link>
        <Link
          accessibilityLabel="Terms of service"
          accessibilityRole="link"
          className="text-base font-medium text-[#FF6B5C]"
          href="/terms"
        >
          Terms
        </Link>
        <Link
          accessibilityLabel="Support and frequently asked questions"
          accessibilityRole="link"
          className="text-base font-medium text-[#FF6B5C]"
          href="/support"
        >
          Support
        </Link>
      </View>
      <Text className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        Questions? {marketingSupportEmail}
      </Text>
    </View>
  );
}
