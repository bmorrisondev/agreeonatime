import type { ReactElement } from 'react';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { DsButton } from '@/components/design-system/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { t } from '@/lib/i18n/t';

export type DsDateTimeMode = 'date' | 'time' | 'datetime';

export interface DsDateTimeFieldProps {
  readonly label: string;
  readonly value: Date;
  readonly onChange: (next: Date) => void;
  readonly mode?: DsDateTimeMode;
  readonly optional?: boolean;
}

function formatValue(value: Date, mode: DsDateTimeMode): string {
  if (mode === 'time') {
    return value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (mode === 'date') {
    return value.toLocaleDateString();
  }
  return `${value.toLocaleDateString()} ${value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

export function DsDateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  optional = false,
}: DsDateTimeFieldProps): ReactElement {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const labelText = `${label}${optional ? ` (${t('ds_textField_optional')})` : ''}`;

  if (Platform.OS === 'web') {
    return (
      <View className="w-full">
        <Text
          allowFontScaling
          className="mb-ds-sm text-caption font-medium text-neutral-800 dark:text-neutral-200"
          maxFontSizeMultiplier={2}
        >
          {labelText}
        </Text>
        <Text allowFontScaling className="text-body text-neutral-600 dark:text-neutral-400" maxFontSizeMultiplier={2}>
          {t('ds_dateTime_webUnavailable')}
        </Text>
      </View>
    );
  }

  const pickerMode = (mode === 'datetime' ? 'datetime' : mode) as 'date' | 'time' | 'datetime';

  return (
    <View className="w-full">
      <Text
        allowFontScaling
        accessibilityRole="text"
        className="mb-ds-sm text-caption font-medium text-neutral-800 dark:text-neutral-200"
        maxFontSizeMultiplier={2}
      >
        {labelText}
      </Text>
      <Pressable
        accessibilityHint={t('ds_dateTimeField_choose')}
        accessibilityLabel={`${labelText}, ${formatValue(value, mode)}`}
        accessibilityRole="button"
        className="min-h-[44px] justify-center rounded-ds-md border border-neutral-300 bg-white px-ds-lg py-ds-md dark:border-neutral-600 dark:bg-neutral-900"
        onPress={() => setOpen(true)}
      >
        <Text allowFontScaling className="text-body text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
          {formatValue(value, mode)}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal
          accessibilityViewIsModal
          animationType={reduceMotion ? 'none' : 'slide'}
          transparent
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-ds-md bg-white p-ds-lg dark:bg-neutral-900">
              <View className="mb-ds-md flex-row items-center gap-ds-sm">
                <Pressable
                  accessibilityLabel={t('ds_modal_close_a11y')}
                  accessibilityRole="button"
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-ds-sm p-ds-sm"
                  hitSlop={8}
                  onPress={() => setOpen(false)}
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
                  {labelText}
                </Text>
              </View>
              <DateTimePicker
                display="spinner"
                mode={pickerMode === 'datetime' ? 'datetime' : pickerMode}
                value={value}
                onChange={(_, date) => {
                  if (date != null) {
                    onChange(date);
                  }
                }}
              />
              <View className="mt-ds-md flex-row justify-end gap-ds-md">
                <DsButton variant="secondary" onPress={() => setOpen(false)}>
                  {t('ds_common_cancel')}
                </DsButton>
                <DsButton variant="primary" onPress={() => setOpen(false)}>
                  {t('ds_common_ok')}
                </DsButton>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          display="default"
          mode={pickerMode === 'datetime' ? 'date' : pickerMode}
          value={value}
          onChange={(_, date) => {
            setOpen(false);
            if (date != null) {
              onChange(date);
            }
          }}
        />
      ) : null}
    </View>
  );
}
