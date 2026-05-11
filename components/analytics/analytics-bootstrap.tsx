import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { makeFunctionReference } from 'convex/server';
import { useConvexAuth, useQuery } from 'convex/react';
import { Platform } from 'react-native';
import { usePostHog } from 'posthog-react-native';

import { authClient } from '@/lib/auth-client';
import { isConvexConfigured } from '@/lib/convex/client';
import { posthogClientRef } from '@/lib/analytics/posthog-ref';
import { consumeShouldEmitSignedUp } from '@/lib/analytics/signup-dedupe';

const currentProfileQuery = makeFunctionReference<'query'>('users:currentProfile');

/**
 * Registers the PostHog client on a ref, fires core funnel events (DEV-397).
 * Render only as a descendant of `PostHogProvider` on native when configured.
 */
export function AnalyticsBootstrap(): ReactElement | null {
  const posthog = usePostHog();
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const { data: session } = authClient.useSession();

  const profile = useQuery(
    currentProfileQuery,
    isConvexConfigured() && !convexAuthLoading && isAuthenticated ? {} : 'skip',
  );

  const appLaunched = useRef(false);
  const signedInOnce = useRef(false);
  const signupHandledForProfileId = useRef<string | null>(null);
  const wasAuthed = useRef(false);

  useEffect(() => {
    posthogClientRef.current = posthog;
    return () => {
      posthogClientRef.current = null;
    };
  }, [posthog]);

  useEffect(() => {
    if (appLaunched.current) {
      return;
    }
    appLaunched.current = true;
    posthog.capture('app_launched', { platform: Platform.OS });
  }, [posthog]);

  useEffect(() => {
    if (session?.user == null) {
      signedInOnce.current = false;
      return;
    }
    if (signedInOnce.current) {
      return;
    }
    signedInOnce.current = true;
    posthog.capture('signed_in', {
      auth_user_id: session.user.id,
    });
  }, [posthog, session?.user]);

  useEffect(() => {
    if (profile === undefined || profile === null) {
      return;
    }

    posthog.identify(profile._id, {
      email: profile.email,
      name: profile.name,
    });

    if (signupHandledForProfileId.current === profile._id) {
      return;
    }

    if (consumeShouldEmitSignedUp(profile._id, profile.createdAt)) {
      posthog.capture('signed_up', {
        convex_user_id: profile._id,
      });
    }
    signupHandledForProfileId.current = profile._id;
  }, [posthog, profile]);

  useEffect(() => {
    if (session?.user != null) {
      wasAuthed.current = true;
      return;
    }
    if (wasAuthed.current) {
      posthog.reset();
      wasAuthed.current = false;
    }
  }, [posthog, session?.user]);

  return null;
}
