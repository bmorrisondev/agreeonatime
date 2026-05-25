import type { ReactElement } from 'react';
import { forwardRef } from 'react';
import { Image } from 'expo-image';
import { Text, View, type View as ViewType } from 'react-native';

import { formatAgreedCardTime } from '@/lib/events/format-agreed-card-time';
import { t } from '@/lib/i18n/t';

export const AGREED_CARD_WIDTH = 375;
export const AGREED_CARD_HEIGHT = 500;

const BRAND = '#FF6B5C';
const CARD_BG = '#FFFBF7';

export interface AgreedCardProps {
  readonly title: string;
  readonly decidedStartTimeMs: number;
}

export const AgreedCard = forwardRef<ViewType, AgreedCardProps>(function AgreedCard(
  { title, decidedStartTimeMs },
  ref,
): ReactElement {
  const whenLabel = formatAgreedCardTime(decidedStartTimeMs);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: AGREED_CARD_WIDTH,
        height: AGREED_CARD_HEIGHT,
        backgroundColor: CARD_BG,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: 8, backgroundColor: BRAND }} />
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={{ width: 36, height: 36, borderRadius: 8 }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#525252',
              letterSpacing: 0.2,
            }}
          >
            Agree on a Time
          </Text>
        </View>

        <Text
          style={{
            marginTop: 36,
            fontSize: 14,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: BRAND,
          }}
        >
          {t('agreed_card_headline')}
        </Text>

        <View style={{ marginTop: 12, overflow: 'visible' as const }}>
          <Text
            style={{
              fontSize: 32,
              lineHeight: 44,
              fontWeight: '800',
              color: '#171717',
              paddingTop: 4,
            }}
          >
            {title}
          </Text>
        </View>

        <View
          style={{
            marginTop: 28,
            borderLeftWidth: 4,
            borderLeftColor: BRAND,
            paddingLeft: 16,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              lineHeight: 30,
              fontWeight: '600',
              color: '#262626',
            }}
          >
            {whenLabel}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            fontWeight: '500',
            color: '#737373',
          }}
        >
          {t('agreed_card_tagline')}
        </Text>
      </View>
    </View>
  );
});
