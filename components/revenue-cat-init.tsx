import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { authClient } from '@/lib/auth-client';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

/**
 * Configures RevenueCat on native iOS when a public SDK key is present (DEV-393).
 */
export function RevenueCatInit(): ReactElement | null {
  const { data: session } = authClient.useSession();
  const configuredRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' || IOS_KEY == null || IOS_KEY.length === 0) {
      return;
    }
    if (!configuredRef.current) {
      void Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
      void Purchases.configure({ apiKey: IOS_KEY });
      configuredRef.current = true;
    }
    const uid = session?.user?.id;
    if (uid == null || uid.length === 0) {
      void Purchases.logOut().catch(() => {});
      return;
    }
    void Purchases.logIn(uid).catch(() => {});
  }, [session?.user?.id]);

  return null;
}
