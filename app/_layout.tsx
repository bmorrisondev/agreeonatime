import type { ReactElement } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import '../global.css';

import { AdMobInit } from '@/components/ads/admob-init';
import { EnsureConvexUser } from '@/components/auth/ensure-convex-user';
import { ModalHeaderClose } from '@/components/navigation/modal-header-close';
import { RegisterExpoPush } from '@/components/register-expo-push';
import { RevenueCatIdentify } from '@/components/purchases/revenuecat-identify';
import { SubscriptionSync } from '@/components/purchases/subscription-sync';
import { RevenueCatInit } from '@/components/revenue-cat-init';
import { NativeSplashConvexAuthGate, NativeSplashFontsOnlyGate } from '@/components/splash/native-splash-gate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { isConvexConfigured } from '@/lib/convex/client';
import { initSentry, Sentry } from '@/lib/sentry';

initSentry();

void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error('[RootLayout] SplashScreen.preventAutoHideAsync failed', error);
});

function WebBrandHead(): ReactElement {
  return (
    <Head>
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="alternate icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#FF6B5C" />
      <meta name="theme-color" content="#FF6B5C" />
    </Head>
  );
}

function NavigationTree(): ReactElement {
  const colorScheme = useColorScheme();

  return (
    <>
      <WebBrandHead />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-event"
            options={{
              presentation: 'modal',
              title: 'New event',
              headerLeft: () => <ModalHeaderClose />,
            }}
          />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="vote/[token]" options={{ title: 'Vote' }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="design-system" options={{ headerShown: true }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </>
  );
}

function RootLayout(): ReactElement {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

  if (!isConvexConfigured() || convexUrl == null || convexUrl.length === 0) {
    return (
      <>
        <NativeSplashFontsOnlyGate />
        <AdMobInit />
        <NavigationTree />
      </>
    );
  }

  const convex = new ConvexReactClient(convexUrl, {
    expectAuth: false,
    unsavedChangesWarning: false,
  });

  return (
    <ConvexProvider client={convex}>
      <ConvexBetterAuthProvider authClient={authClient} client={convex}>
        <NativeSplashConvexAuthGate />
        <AdMobInit />
        <RevenueCatInit />
        <RegisterExpoPush />
        <EnsureConvexUser />
        <RevenueCatIdentify />
        <SubscriptionSync />
        <NavigationTree />
      </ConvexBetterAuthProvider>
    </ConvexProvider>
  );
}

export default Sentry.wrap(RootLayout);
