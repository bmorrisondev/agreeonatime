import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { t } from '@/lib/i18n/t';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export interface DsAvatarStackProps {
  readonly names: readonly string[];
  readonly maxVisible?: number;
}

export function DsAvatarStack({ names, maxVisible = 3 }: DsAvatarStackProps): ReactElement {
  const shown = names.slice(0, maxVisible);
  const overflow = names.length - shown.length;
  const label = t('ds_avatarStack_a11y', { names: names.join(', ') });

  return (
    <View accessibilityLabel={label} accessibilityRole="image" className="flex-row items-center">
      {shown.map((name, index) => (
        <View
          key={`${name}-${String(index)}`}
          className={[
            'h-10 w-10 items-center justify-center rounded-ds-pill border-2 border-white bg-brand dark:border-neutral-900',
            index > 0 ? '-ml-ds-sm' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ zIndex: shown.length - index }}
        >
          <Text allowFontScaling className="text-caption font-semibold text-brand-on" maxFontSizeMultiplier={2}>
            {initials(name)}
          </Text>
        </View>
      ))}
      {overflow > 0 ? (
        <View
          className={[
            'h-10 min-w-10 items-center justify-center rounded-ds-pill border-2 border-white bg-neutral-300 px-ds-xs dark:border-neutral-900 dark:bg-neutral-600',
            shown.length > 0 ? '-ml-ds-sm' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Text allowFontScaling className="text-caption font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            +{overflow}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
