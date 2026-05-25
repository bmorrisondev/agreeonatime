import type { ReactElement } from 'react';

import type { AdPlacementId } from '@/lib/ads/constants';

export interface AdBannerProps {
  readonly placement: AdPlacementId;
  /** Web vote page: gate on event owner subscription (DEV-454). */
  readonly voterMode?: boolean;
  readonly ownerHasActiveSub?: boolean;
}

/** Default stub — platform files override (`.web.tsx`, `.native.tsx`). */
export function AdBanner(_props: AdBannerProps): ReactElement | null {
  return null;
}
