import type { PostHog } from 'posthog-react-native';

/** Set by `AnalyticsBootstrap` when PostHog is active; used for reset on sign-out without hooks. */
export const posthogClientRef: { current: PostHog | null } = { current: null };

export function resetPosthogFromRef(): void {
  posthogClientRef.current?.reset();
}
