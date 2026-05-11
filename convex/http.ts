// @ts-nocheck — HTTP routes for Better Auth; types after `pnpm convex:dev`.
import { httpRouter } from 'convex/server';

import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
