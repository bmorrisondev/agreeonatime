import type { ReactElement } from 'react';

/** No-op on web — native AdMob SDK is not bundled for static export. */
export function AdMobInit(): ReactElement | null {
  return null;
}
