import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { DsButton } from '@/components/design-system/button';

export interface DsEmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onActionPress?: () => void;
}

export function DsEmptyState({
  title,
  description,
  actionLabel,
  onActionPress,
}: DsEmptyStateProps): ReactElement {
  return (
    <View className="items-center justify-center px-ds-xl py-ds-2xl">
      <Text allowFontScaling className="text-center text-heading font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
        {title}
      </Text>
      <Text
        allowFontScaling
        className="mt-ds-md max-w-sm text-center text-body text-neutral-600 dark:text-neutral-400"
        maxFontSizeMultiplier={2}
      >
        {description}
      </Text>
      {actionLabel != null && onActionPress != null ? (
        <View className="mt-ds-xl w-full max-w-xs">
          <DsButton accessibilityHint={actionLabel} onPress={onActionPress}>
            {actionLabel}
          </DsButton>
        </View>
      ) : null}
    </View>
  );
}
