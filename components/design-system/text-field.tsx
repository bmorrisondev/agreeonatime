import type { ReactElement } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { t } from '@/lib/i18n/t';

export interface DsTextFieldProps extends TextInputProps {
  /** Pass `t('some_key')` from the catalog for i18n-ready screens. */
  readonly label: string;
  readonly optional?: boolean;
  readonly error?: string;
}

export function DsTextField({
  label,
  optional = false,
  error: errorMessage,
  accessibilityLabel,
  className,
  ...rest
}: DsTextFieldProps): ReactElement {
  const labelText = `${label}${optional ? ` (${t('ds_textField_optional')})` : ''}`;
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
      <TextInput
        accessibilityLabel={accessibilityLabel ?? labelText}
        allowFontScaling
        className={[
          'rounded-ds-md border border-neutral-300 bg-white px-ds-lg py-ds-md text-body text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100',
          errorMessage != null ? 'border-danger' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        placeholderTextColor="#9ca3af"
        {...rest}
      />
      {errorMessage != null ? (
        <Text
          allowFontScaling
          accessibilityLiveRegion="polite"
          className="mt-ds-sm text-caption text-danger"
          maxFontSizeMultiplier={2}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
