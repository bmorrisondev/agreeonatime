import type { ReactElement } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import '../global.css';

import { EnsureConvexUser } from '@/components/auth/ensure-convex-user';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { isConvexConfigured } from '@/lib/convex/client';

function NavigationTree(): ReactElement {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-event" options={{ presentation: 'modal', title: 'New event' }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout(): ReactElement {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

  if (!isConvexConfigured() || convexUrl == null || convexUrl.length === 0) {
    return <NavigationTree />;
  }

  const convex = new ConvexReactClient(convexUrl, {
    expectAuth: false,
    unsavedChangesWarning: false,
  });

  return (
    <ConvexProvider client={convex}>
      <ConvexBetterAuthProvider authClient={authClient} client={convex}>
        <EnsureConvexUser />
        <NavigationTree />
      </ConvexBetterAuthProvider>
    </ConvexProvider>
  );
}
