import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/lib/i18n/t';

export interface DsToastProps {
  readonly visible: boolean;
  readonly message: string;
  readonly onDismiss: () => void;
  readonly durationMs?: number;
}

export function DsToast({
  visible,
  message,
  onDismiss,
  durationMs = 2800,
}: DsToastProps): ReactElement | null {
  useEffect(() => {
    if (!visible) {
      return;
    }
    const id = setTimeout(() => onDismiss(), durationMs);
    return () => clearTimeout(id);
  }, [durationMs, onDismiss, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="pointer-events-box-none absolute bottom-0 left-0 right-0 items-center pb-ds-2xl pt-ds-sm"
      pointerEvents="box-none"
    >
      <View className="mx-ds-lg w-full max-w-md flex-row items-center rounded-ds-md bg-neutral-900 px-ds-lg py-ds-md dark:bg-neutral-100">
        <Text allowFontScaling className="flex-1 text-body text-white dark:text-neutral-900" maxFontSizeMultiplier={2}>
          {message}
        </Text>
        <Pressable
          accessibilityLabel={t('ds_toast_dismiss_a11y')}
          accessibilityRole="button"
          className="ml-ds-md rounded-ds-sm p-ds-xs"
          hitSlop={10}
          onPress={onDismiss}
        >
          <Text allowFontScaling className="text-caption font-semibold text-white dark:text-neutral-900" maxFontSizeMultiplier={2}>
            {t('ds_common_ok')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
