/**
 * Used when `EXPO_PUBLIC_CONVEX_URL` is unset so `ConvexProvider` still mounts.
 * Convex hooks (`useQuery`, `useConvex`, …) require context; queries should use `'skip'` when
 * {@link isConvexConfigured} is false.
 */
export const PLACEHOLDER_CONVEX_DEPLOYMENT_URL = 'https://placeholder.convex.cloud';

/**
 * Deployment URL for `ConvexReactClient`. Prefer the real dev/prod URL from env.
 */
export function getConvexDeploymentUrl(): string {
  const url = process.env.EXPO_PUBLIC_CONVEX_URL?.trim();
  return url != null && url.length > 0 ? url : PLACEHOLDER_CONVEX_DEPLOYMENT_URL;
}

/**
 * True when a real Convex deployment is configured (not the placeholder).
 */
export function isConvexConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_CONVEX_URL?.trim();
  return url != null && url.length > 0;
}
