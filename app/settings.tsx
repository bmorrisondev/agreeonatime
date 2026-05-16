import type { ReactElement } from 'react';
import { Redirect } from 'expo-router';

/**
 * Deep links and legacy paths may still hit `/settings`.
 * Primary settings UI lives on the Settings tab.
 */
export default function SettingsRedirect(): ReactElement {
  return <Redirect href="/(tabs)/settings" />;
}
