// @ts-nocheck — HTTP routes for Better Auth; types after `pnpm convex:dev`.
import { httpRouter } from 'convex/server';

import { authComponent, createAuth } from './auth';

const http = httpRouter();

/**
 * `registerRoutes` CORS `allowedOrigins` are merged with Better Auth `trustedOrigins`
 * (see `convex/auth.ts`). Without `SITE_URL` on the deployment, localhost is missing and
 * Expo web (`pnpm web`) hits CORS on `/api/auth/*`.
 */
authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: ['http://localhost:8081', 'http://127.0.0.1:8081'],
  },
});

export default http;
