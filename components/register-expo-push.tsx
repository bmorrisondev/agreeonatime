import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { makeFunctionReference } from 'convex/server';
import { useConvexAuth, useMutation } from 'convex/react';

import { isConvexConfigured } from '@/lib/convex/client';

const registerPushTokenMutation = makeFunctionReference<'mutation'>('users:registerPushToken');

/**
 * Registers the device push token with Convex once per install (DEV-391). Skips web and simulators without push.
 */
export function RegisterExpoPush(): ReactElement | null {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const register = useMutation(registerPushTokenMutation);
  const done = useRef(false);

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      !isConvexConfigured() ||
      done.current ||
      Platform.OS === 'web' ||
      !Device.isDevice
    ) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (cancelled || status !== 'granted') {
          return;
        }
        const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
        const token = await Notifications.getExpoPushTokenAsync(
          projectId != null && projectId.length > 0 ? { projectId } : undefined,
        );
        if (cancelled || token.data.length === 0) {
          return;
        }
        await register({ token: token.data });
        done.current = true;
      } catch {
        /* non-fatal — user may deny or push unavailable */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, register]);

  return null;
}
