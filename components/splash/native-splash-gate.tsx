import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useConvexAuth } from 'convex/react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { authClient } from '@/lib/auth-client';

/** Hides the native splash after fonts, Convex auth, and Better Auth session hydration settle. */
export function NativeSplashConvexAuthGate(): ReactElement | null {
  const { isLoading } = useConvexAuth();
  const { isPending: isSessionPending } = authClient.useSession();
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Font.loadAsync({})
      .catch((error: unknown) => {
        console.error('[NativeSplashConvexAuthGate] Font.loadAsync failed', error);
      })
      .finally(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontsReady || isLoading || isSessionPending) {
      return;
    }
    void SplashScreen.hideAsync().catch((error: unknown) => {
      console.error('[NativeSplashConvexAuthGate] SplashScreen.hideAsync failed', error);
    });
  }, [fontsReady, isLoading, isSessionPending]);

  return null;
}

/** Used when Convex is disabled (e.g. missing env): hide after the font layer is ready. */
export function NativeSplashFontsOnlyGate(): ReactElement | null {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Font.loadAsync({})
      .catch((error: unknown) => {
        console.error('[NativeSplashFontsOnlyGate] Font.loadAsync failed', error);
      })
      .finally(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontsReady) {
      return;
    }
    void SplashScreen.hideAsync().catch((error: unknown) => {
      console.error('[NativeSplashFontsOnlyGate] SplashScreen.hideAsync failed', error);
    });
  }, [fontsReady]);

  return null;
}
