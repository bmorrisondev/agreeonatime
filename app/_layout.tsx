import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import '../global.css';

import { EnsureConvexUser } from '@/components/auth/ensure-convex-user';
import { WebOttLandingFix } from '@/components/auth/web-ott-landing-fix';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { syncNormalizeMagicLinkLandingUrl } from '@/lib/auth/sync-magic-link-url';
import { getConvexDeploymentUrl } from '@/lib/convex/client';

/** Before Expo Router's first render — fixes bogus magic-link landings (see `sync-magic-link-url.ts`). */
syncNormalizeMagicLinkLandingUrl();

function NavigationTree(): ReactElement {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-event" options={{ presentation: 'modal', title: 'New event' }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
        <Stack.Screen name="design-system" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout(): ReactElement {
  const deploymentUrl = getConvexDeploymentUrl();

  const convex = useMemo(
    () =>
      new ConvexReactClient(deploymentUrl, {
        expectAuth: false,
        unsavedChangesWarning: false,
      }),
    [deploymentUrl],
  );

  return (
    <ConvexProvider client={convex}>
      <ConvexBetterAuthProvider authClient={authClient} client={convex}>
        <WebOttLandingFix />
        <EnsureConvexUser />
        <NavigationTree />
      </ConvexBetterAuthProvider>
    </ConvexProvider>
  );
}
