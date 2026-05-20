// @ts-nocheck — HTTP routes for Better Auth; types after `pnpm convex:dev`.
import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

import { authComponent, createAuth } from './auth';
import { webAuthOrigins } from './site_origins';

const http = httpRouter();

/** RevenueCat webhook — set the same bearer token in the RC dashboard and `REVENUECAT_WEBHOOK_AUTHORIZATION`. */
http.route({
  path: '/revenuecat-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const expected = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim();
    let authorized = expected == null || expected.length === 0;
    if (!authorized) {
      const auth = req.headers.get('Authorization')?.trim() ?? '';
      const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth;
      authorized = bearer === expected;
      if (!authorized) {
        console.warn('[revenuecat-webhook] unauthorized', {
          hasAuthorizationHeader: auth.length > 0,
        });
        return new Response('Unauthorized', { status: 401 });
      }
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch (parseError: unknown) {
      console.error('[revenuecat-webhook] invalid JSON body', parseError);
      return new Response('Bad Request', { status: 400 });
    }

    console.log('[revenuecat-webhook] request', {
      authorized,
      receivedAt: new Date().toISOString(),
      body,
    });

    const event = (
      body as {
        event?: {
          app_user_id?: string;
          original_app_user_id?: string;
          aliases?: string[];
          type?: string;
          entitlement_id?: string | null;
          entitlement_ids?: string[] | null;
          product_id?: string | null;
          expiration_at_ms?: number | null;
        };
      }
    )?.event;

    if (event?.product_id === 'agreeonatime_pro_monthly') {
      console.warn(
        '[revenuecat-webhook] legacy Test Store product agreeonatime_pro_monthly ($9.99) — ' +
          'archive it in RevenueCat and use agreeonatime_pro_monthly_399 on the default offering.',
      );
    }
    const authUserId = event?.app_user_id;
    if (authUserId == null || authUserId.length === 0) {
      console.warn('[revenuecat-webhook] missing event.app_user_id — skipping sync', {
        eventType: event?.type,
      });
      return new Response('OK', { status: 200 });
    }

    console.log('[revenuecat-webhook] scheduling sync', {
      authUserId,
      eventType: event?.type,
      entitlement_ids: event?.entitlement_ids,
      product_id: event?.product_id,
      aliases: event?.aliases,
    });

    await ctx.scheduler.runAfter(0, internal.subscriptions.syncFromRevenueCatInternal, {
      authUserId,
      webhookEvent: {
        type: event.type,
        app_user_id: event.app_user_id,
        original_app_user_id: event.original_app_user_id,
        aliases: event.aliases,
        entitlement_id: event.entitlement_id,
        entitlement_ids: event.entitlement_ids,
        product_id: event.product_id,
        expiration_at_ms: event.expiration_at_ms,
      },
    });

    return new Response('OK', { status: 200 });
  }),
});

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
