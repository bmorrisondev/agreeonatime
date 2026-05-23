import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { t } from '@/lib/i18n/t';

const MUTED = '#737373';

export function ModalHeaderClose(): ReactElement {
  return (
    <Pressable
      accessibilityLabel={t('ds_modal_close_a11y')}
      accessibilityRole="button"
      className="-ml-1 min-h-[44px] min-w-[44px] items-center justify-center p-2"
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }}
    >
      <IconSymbol color={MUTED} name="xmark" size={22} />
    </Pressable>
  );
}
