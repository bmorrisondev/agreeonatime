// @ts-nocheck — HTTP routes for Better Auth; types after `pnpm convex:dev`.
import { httpRouter } from 'convex/server';

import { authComponent, createAuth } from './auth';
import { webAuthOrigins } from './site_origins';

const http = httpRouter();

/**
 * `registerRoutes` CORS `allowedOrigins` are merged with Better Auth `trustedOrigins`
 * (see `convex/auth.ts`). Set `SITE_URL` on the deployment to your deployed web origin
 * (e.g. Vercel) so Expo web / marketing domain can call `/api/auth/*`.
 */
authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: webAuthOrigins(),
  },
});

export default http;
