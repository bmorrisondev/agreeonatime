import type { ReactElement } from 'react';
import { Stack } from 'expo-router';

/**
 * Nested routes under `/sign-in` catch broken magic-link URLs like `/sign-in/nEmail?ott=…`
 * (email clients resolving a relative `nEmail` href against `/sign-in`).
 */
export default function SignInLayout(): ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />;
}
