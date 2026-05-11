import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import { PostHogProvider } from 'posthog-react-native';

import { AnalyticsBootstrap } from '@/components/analytics/analytics-bootstrap';
import { createPosthogCustomStorage } from '@/lib/analytics/posthog-storage';
import { getPosthogHost, isPosthogNativeConfigured } from '@/lib/analytics/posthog-env';

export function NativePostHogRoot({ children }: { readonly children: ReactNode }): ReactElement {
  if (Platform.OS === 'web' || !isPosthogNativeConfigured()) {
    return <>{children}</>;
  }

  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';

  return (
    <PostHogProvider
      apiKey={apiKey}
      autocapture={false}
      options={{
        host: getPosthogHost(),
        customStorage: createPosthogCustomStorage(),
        captureAppLifecycleEvents: false,
      }}
    >
      <AnalyticsBootstrap />
      {children}
    </PostHogProvider>
  );
}
