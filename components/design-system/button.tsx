import type { ReactElement } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';

export type DsButtonVariant = 'primary' | 'secondary' | 'destructive';

export interface DsButtonProps extends Omit<PressableProps, 'children'> {
  readonly variant?: DsButtonVariant;
  readonly children: string;
  readonly accessibilityHint?: string;
}

const variantClasses: Record<DsButtonVariant, string> = {
  primary: 'bg-brand active:bg-brand-pressed',
  secondary:
    'border border-neutral-300 bg-transparent active:bg-neutral-100 dark:border-neutral-600 dark:active:bg-neutral-800',
  destructive: 'bg-danger active:bg-danger-pressed',
};

const textClasses: Record<DsButtonVariant, string> = {
  primary: 'text-brand-on',
  secondary: 'text-neutral-900 dark:text-neutral-100',
  destructive: 'text-danger-on',
};

export function DsButton({
  variant = 'primary',
  children,
  accessibilityHint,
  disabled,
  className,
  ...rest
}: DsButtonProps): ReactElement {
  const base =
    'min-h-[48px] items-center justify-center rounded-ds-md px-ds-xl py-ds-sm opacity-100 disabled:opacity-40';
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={[base, variantClasses[variant], disabled ? '' : '', className].filter(Boolean).join(' ')}
      disabled={disabled}
      {...rest}
    >
      <Text
        allowFontScaling
        className={['text-center text-body font-semibold', textClasses[variant]].join(' ')}
        maxFontSizeMultiplier={2}
      >
        {children}
      </Text>
    </Pressable>
  );
}
