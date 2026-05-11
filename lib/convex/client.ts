/**
 * Client env helpers. The Convex client is constructed in `app/_layout.tsx`
 * when `EXPO_PUBLIC_CONVEX_URL` is set (with Better Auth).
 */
export function isConvexConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_CONVEX_URL;
  return url != null && url.length > 0;
}
