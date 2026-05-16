import type { ReactElement } from 'react';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { ONBOARDING_ACCENT, ONBOARDING_BG } from '@/components/onboarding/onboarding-theme';

const MARK_STROKE_SOFT = 'rgba(255, 107, 92, 0.55)';

export interface AppIconMarkProps {
  readonly size?: number;
}

/**
 * Foreground mark from {@link assets/images/app-icon-mark.svg} (clock + check).
 */
export function AppIconMark({ size = 72 }: AppIconMarkProps): ReactElement {
  return (
    <Svg
      accessibilityLabel="Agree on a Time mark"
      height={size}
      viewBox="0 0 1024 1024"
      width={size}
    >
      <G transform="translate(512 512)">
        <Circle cx={0} cy={0} r={278} fill="none" stroke={ONBOARDING_ACCENT} strokeWidth={20} />
        <G stroke={MARK_STROKE_SOFT} strokeLinecap="round" strokeWidth={12}>
          <Line x1={0} x2={0} y1={-250} y2={-284} />
          <Line x1={250} x2={284} y1={0} y2={0} />
          <Line x1={0} x2={0} y1={250} y2={284} />
          <Line x1={-250} x2={-284} y1={0} y2={0} />
        </G>
      </G>
      <Circle cx={708.575} cy={708.575} fill={ONBOARDING_ACCENT} r={57.2} />
      <G transform="translate(708.575 708.575)">
        <Path
          d="M -22 1.1 L -7.7 15.4 L 22 -17.6"
          fill="none"
          stroke={ONBOARDING_BG}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={12.1}
        />
      </G>
      <G transform="translate(512 512)">
        <Line
          stroke={ONBOARDING_ACCENT}
          strokeLinecap="round"
          strokeWidth={22}
          x1={0}
          x2={97.5797}
          y1={0}
          y2={97.5797}
        />
        <Line
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeWidth={20}
          x1={0}
          x2={0}
          y1={0}
          y2={-207.1}
        />
        <Circle cx={0} cy={0} fill="#FFFFFF" r={14} />
      </G>
    </Svg>
  );
}
