import type { ReactElement, RefObject } from 'react';
import { View, type View as ViewType } from 'react-native';

import { AgreedCard } from '@/components/events/agreed-card';

export interface AgreedCardShareHostProps {
  readonly cardRef: RefObject<ViewType | null>;
  readonly title: string;
  readonly decidedStartTimeMs: number;
}

/** Off-screen card used as the capture target for view-shot. */
export function AgreedCardShareHost({
  cardRef,
  title,
  decidedStartTimeMs,
}: AgreedCardShareHostProps): ReactElement {
  return (
    <View
      pointerEvents="none"
      collapsable={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: -10_000, top: 0, opacity: 0 }}
    >
      <AgreedCard ref={cardRef} title={title} decidedStartTimeMs={decidedStartTimeMs} />
    </View>
  );
}
