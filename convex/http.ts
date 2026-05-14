// @ts-nocheck — HTTP routes for Better Auth; types after `pnpm convex:dev`.
import { httpRouter } from 'convex/server';

import { authComponent, createAuth } from './auth';

const EXPO_WEB_DEV_ORIGINS = ['http://localhost:8081', 'http://127.0.0.1:8081'] as const;

function splitOrigins(raw: string | undefined): string[] {
  if (raw == null || raw.trim().length === 0) {
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function corsAllowedOriginsForHttp(): string[] {
  return [...new Set([...EXPO_WEB_DEV_ORIGINS, ...splitOrigins(process.env.SITE_URL)])];
}

const http = httpRouter();

/**
 * `registerRoutes` CORS `allowedOrigins` are merged with Better Auth `trustedOrigins`
 * (see `convex/auth.ts`). Set `SITE_URL` on the deployment to your deployed web origin
 * (e.g. Vercel) so Expo web / marketing domain can call `/api/auth/*`.
 */
authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: corsAllowedOriginsForHttp(),
  },
});

export default http;
