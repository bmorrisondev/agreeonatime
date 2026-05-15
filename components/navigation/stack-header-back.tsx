import type { ReactElement } from 'react';
import { Pressable, Text } from 'react-native';
import type { Href } from 'expo-router';
import { router } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';

const BRAND = '#FF6B5C';

export interface StackHeaderBackProps {
  /** Shown next to the chevron (e.g. “Home”). */
  readonly label: string;
  /** When there is no stack history, navigate here. */
  readonly fallbackHref: Href;
  readonly accessibilityLabel?: string;
}

/**
 * Stack header control for screens that are the first route in a nested stack (no system back).
 */
export function StackHeaderBack({
  label,
  fallbackHref,
  accessibilityLabel = `Go back to ${label}`,
}: StackHeaderBackProps): ReactElement {
  const onPress = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="-ml-1 flex-row items-center gap-0.5 py-1 pr-2"
      hitSlop={10}
      onPress={onPress}
    >
      <IconSymbol color={BRAND} name="chevron.left" size={22} />
      <Text allowFontScaling className="text-[17px] font-medium text-[#FF6B5C]" maxFontSizeMultiplier={2}>
        {label}
      </Text>
    </Pressable>
  );
}
