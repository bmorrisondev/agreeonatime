import type { ReactElement, ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

import { t } from '@/lib/i18n/t';

export interface DsListItemProps extends Omit<PressableProps, 'children'> {
  readonly title: string;
  readonly subtitle?: string;
  readonly rightAccessory?: ReactNode;
}

export function DsListItem({
  title,
  subtitle,
  rightAccessory,
  accessibilityLabel,
  className,
  ...rest
}: DsListItemProps): ReactElement {
  const a11yLabel = accessibilityLabel ?? (subtitle != null ? `${title}, ${subtitle}` : title);
  return (
    <Pressable
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      className={[
        'flex-row items-center justify-between border-b border-neutral-200 py-ds-md dark:border-neutral-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <View className="min-w-0 flex-1 pr-ds-md">
        <Text allowFontScaling className="text-body font-medium text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
          {title}
        </Text>
        {subtitle != null ? (
          <Text
            allowFontScaling
            className="mt-ds-xs text-caption text-neutral-600 dark:text-neutral-400"
            maxFontSizeMultiplier={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAccessory != null ? (
        <View accessibilityLabel={t('ds_listItem_chevron_a11y')}>{rightAccessory}</View>
      ) : null}
    </Pressable>
  );
}
