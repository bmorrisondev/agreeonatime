// @ts-nocheck — Convex env access; matches `convex/auth.ts`.
import { PRODUCTION_WEB_APP_ORIGIN } from '../lib/constants/app-web-origin';

export { PRODUCTION_WEB_APP_ORIGIN };

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
      PRODUCTION_WEB_APP_ORIGIN,
      ...siteUrlOrigins(),
      ...EXPO_WEB_DEV_ORIGINS,
      VERCEL_APP_PREVIEW_ORIGIN_PREFIX,
    ]),
  ];
}

/** All Better Auth `trustedOrigins` (web, native, Convex site). */
export function betterAuthTrustedOrigins(): string[] {
  const convexSite = process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? '';
  return [
    ...new Set(
      [
        convexSite,
        ...webAuthOrigins(),
        'agreeonatime://',
        'exp://',
        'https://appleid.apple.com',
      ].filter((o) => o.length > 0),
    ),
  ];
}

/** Primary web origin for `crossDomain` plugin (cookies / callbacks). */
export function primaryWebAuthOrigin(): string {
  const fromEnv = siteUrlOrigins().find(
    (u) => u === PRODUCTION_WEB_APP_ORIGIN || u.includes('agreeonatime.com'),
  );
  return fromEnv ?? PRODUCTION_WEB_APP_ORIGIN;
}
