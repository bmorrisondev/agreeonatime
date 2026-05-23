import type { ReactElement, RefObject } from 'react';
import { useMemo } from 'react';
import { useWindowDimensions, View, type View as ViewType } from 'react-native';

import { AgreedCard, AGREED_CARD_HEIGHT, AGREED_CARD_WIDTH } from '@/components/events/agreed-card';
import { formatAgreedCardTime } from '@/lib/events/format-agreed-card-time';
import { t } from '@/lib/i18n/t';

const HORIZONTAL_PADDING = 32;

export interface AgreedCardPreviewProps {
  /** Full-size off-screen card used for PNG capture (no CSS transform). */
  readonly cardRef: RefObject<ViewType | null>;
  readonly title: string;
  readonly decidedStartTimeMs: number;
}

/** Visible scaled preview plus a hidden full-size capture target for view-shot. */
export function AgreedCardPreview({
  cardRef,
  title,
  decidedStartTimeMs,
}: AgreedCardPreviewProps): ReactElement {
  const { width: windowWidth } = useWindowDimensions();

  const scale = useMemo((): number => {
    const maxWidth = Math.max(windowWidth - HORIZONTAL_PADDING, 280);
    return Math.min(1, maxWidth / AGREED_CARD_WIDTH);
  }, [windowWidth]);

  const displayWidth = AGREED_CARD_WIDTH * scale;
  const displayHeight = AGREED_CARD_HEIGHT * scale;
  const translateX = (-AGREED_CARD_WIDTH * (1 - scale)) / 2;
  const translateY = (-AGREED_CARD_HEIGHT * (1 - scale)) / 2;
  const whenLabel = formatAgreedCardTime(decidedStartTimeMs);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('decided_card_preview_a11y', { title, time: whenLabel })}
      className="mt-6 items-center"
    >
      <View
        style={{
          width: displayWidth,
          height: displayHeight,
          overflow: 'hidden',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
          elevation: 6,
        }}
      >
        <View
          style={{
            width: AGREED_CARD_WIDTH,
            height: AGREED_CARD_HEIGHT,
            transform: [{ translateX }, { translateY }, { scale }],
          }}
        >
          <AgreedCard title={title} decidedStartTimeMs={decidedStartTimeMs} />
        </View>
      </View>

      {/* Capture at 1:1 — html2canvas breaks on transformed/scaled nodes. */}
      <View
        pointerEvents="none"
        collapsable={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: -10_000, top: 0 }}
      >
        <AgreedCard ref={cardRef} title={title} decidedStartTimeMs={decidedStartTimeMs} />
      </View>
    </View>
  );
}
