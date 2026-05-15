import type { ReactElement, ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { t } from '@/lib/i18n/t';

export interface DsModalProps {
  readonly visible: boolean;
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}

export function DsModal({ visible, title, children, onClose }: DsModalProps): ReactElement {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/50 px-ds-lg">
        <View className="max-h-[85%] rounded-ds-md bg-white p-ds-lg dark:bg-neutral-900">
          <View className="mb-ds-md flex-row items-center gap-ds-sm">
            <Pressable
              accessibilityLabel={t('ds_modal_close_a11y')}
              accessibilityRole="button"
              className="rounded-ds-sm p-ds-sm"
              hitSlop={8}
              onPress={onClose}
            >
              <Text allowFontScaling className="text-body text-brand" maxFontSizeMultiplier={2}>
                ✕
              </Text>
            </Pressable>
            <Text
              allowFontScaling
              accessibilityRole="header"
              className="min-w-0 flex-1 text-heading font-semibold text-neutral-900 dark:text-neutral-100"
              maxFontSizeMultiplier={2}
            >
              {title}
            </Text>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
