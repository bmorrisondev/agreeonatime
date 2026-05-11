import { ConvexReactClient } from 'convex/react';

const url = process.env.EXPO_PUBLIC_CONVEX_URL;

/**
 * Null until `EXPO_PUBLIC_CONVEX_URL` is set (after `npx convex dev` / deployment).
 * Use `ConvexProvider` only when this is non-null.
 */
export const convexReactClient: ConvexReactClient | null =
  url != null && url.length > 0 ? new ConvexReactClient(url) : null;

export function isConvexConfigured(): boolean {
  return convexReactClient != null;
}
