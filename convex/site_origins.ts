// @ts-nocheck — Convex env access; matches `convex/auth.ts`.
/** Expo `pnpm web` defaults — must match `trustedOrigins` / CORS or auth requests fail. */
export const EXPO_WEB_DEV_ORIGINS = ['http://localhost:8081', 'http://127.0.0.1:8081'] as const;

/**
 * Vercel preview URLs for this project (e.g. `app-agreeonatime-com-git-dev-….vercel.app`).
 * Better Auth CORS treats a trailing `*` as a prefix match on the Convex integration.
 */
export const VERCEL_APP_PREVIEW_ORIGIN_PREFIX = 'https://app-agreeonatime-com-*';

export function splitOrigins(raw: string | undefined): string[] {
  if (raw == null || raw.trim().length === 0) {
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Origins from Convex env `SITE_URL` (comma-separated). */
export function siteUrlOrigins(): string[] {
  return splitOrigins(process.env.SITE_URL);
}

/** Web origins allowed for Better Auth `trustedOrigins` and HTTP CORS. */
export function webAuthOrigins(): string[] {
  return [
    ...new Set([
      ...siteUrlOrigins(),
      ...EXPO_WEB_DEV_ORIGINS,
      VERCEL_APP_PREVIEW_ORIGIN_PREFIX,
    ]),
  ];
}
