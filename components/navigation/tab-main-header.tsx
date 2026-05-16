import type { ReactElement, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface TabMainHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly rightAccessory?: ReactNode;
}

/**
 * In-app header for tab root screens (Home, Settings) — aligns with stack headers (border, typography).
 */
export function TabMainHeader({ title, subtitle, rightAccessory }: TabMainHeaderProps): ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black"
      style={{ paddingTop: insets.top + 4, paddingHorizontal: 16, paddingBottom: 12 }}
    >
      <View className="min-h-[44px] flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text
            accessibilityRole="header"
            allowFontScaling
            className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
            maxFontSizeMultiplier={2}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle != null && subtitle.length > 0 ? (
            <Text
              allowFontScaling
              className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500"
              maxFontSizeMultiplier={2}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAccessory != null ? <View className="shrink-0">{rightAccessory}</View> : null}
      </View>
    </View>
  );
}
