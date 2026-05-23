// @ts-nocheck — HTTP routes for Better Auth; types after `pnpm convex:dev`.
import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

import { authComponent, createAuth } from './auth';
import { parseReminderUnsubscribeToken } from './reminderUnsubscribe';
import { webAuthOrigins } from './site_origins';

const http = httpRouter();

function unsubscribeHtml(title: string, message: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;background:#1C1A2E;color:#FFFFFF;padding:32px;max-width:560px;margin:0 auto"><h1 style="color:#FF6B5C;font-size:24px">${title}</h1><p style="color:#8884AA;line-height:1.5">${message}</p></body></html>`;
}

/** One-click unsubscribe from invitee vote reminders (DEV-435). */
http.route({
  path: '/unsubscribe',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const token = url.searchParams.get('token')?.trim() ?? '';
    if (token.length === 0) {
      return new Response(unsubscribeHtml('Invalid link', 'This unsubscribe link is invalid.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const parsed = await parseReminderUnsubscribeToken(token);
    if (parsed == null) {
      return new Response(unsubscribeHtml('Invalid link', 'This unsubscribe link is invalid or expired.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    await ctx.runMutation(internal.reminderEmails.recordEmailUnsubscribe, {
      email: parsed.email,
      eventId: parsed.eventId,
    });

    return new Response(
      unsubscribeHtml(
        'Unsubscribed',
        'You will no longer receive vote reminders for this event.',
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }),
});

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
