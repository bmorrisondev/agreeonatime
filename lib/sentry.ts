import * as Sentry from '@sentry/react-native';

import { isProductionApp } from '@/lib/env/is-dev-tools-enabled';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';

let initialized = false;

export function initSentry(): void {
  if (initialized || dsn.length === 0) {
    return;
  }

  initialized = true;

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    debug: __DEV__,
    environment: isProductionApp()
      ? 'production'
      : (process.env.EXPO_PUBLIC_BUILD_LABEL?.trim() ?? 'development'),
    tracesSampleRate: isProductionApp() ? 0.2 : 1,
  });
}

export { Sentry };
