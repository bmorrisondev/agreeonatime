import type { ReactElement, ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export interface DsCardProps extends ViewProps {
  readonly children: ReactNode;
}

export function DsCard({ children, className, ...rest }: DsCardProps): ReactElement {
  return (
    <View
      accessibilityRole="none"
      className={[
        'rounded-ds-md border border-neutral-200 bg-white p-ds-lg shadow-sm dark:border-neutral-700 dark:bg-neutral-900',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}
