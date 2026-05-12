// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { v } from 'convex/values';

import { internalAction, internalMutation } from './_generated/server';

/** Resend a simple “time locked in” email to the owner (DEV-391). */
export const ownerDecidedEmail = internalAction({
  args: {
    ownerEmail: v.string(),
    eventTitle: v.string(),
    startTime: v.number(),
  },
  handler: async (_ctx, { ownerEmail, eventTitle, startTime }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const when = new Date(startTime).toISOString();
    if (!apiKey) {
      console.warn(`[notify] Event decided "${eventTitle}" at ${when} — email to ${ownerEmail} (no RESEND_API_KEY)`);
      return;
    }
    const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [ownerEmail],
        subject: `Time locked in: ${eventTitle}`,
        html: `<p>You picked a final time for <strong>${eventTitle}</strong>.</p><p><strong>${when}</strong> (UTC).</p>`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[notify] Resend owner decided email failed:', res.status, text);
    }
  },
});

/**
 * Expo Push HTTP API (DEV-391). Requires `EXPO_ACCESS_TOKEN` in Convex env for production sends.
 */
export const sendExpoPush = internalAction({
  args: {
    expoPushTokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (_ctx, { expoPushTokens, title, body, data }) => {
    const token = process.env.EXPO_ACCESS_TOKEN;
    if (!token) {
      console.warn('[push] EXPO_ACCESS_TOKEN not set; skipping push', expoPushTokens.length, 'tokens');
      return;
    }
    const messages = expoPushTokens.map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }));
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[push] Expo push failed:', res.status, text);
    }
  },
});

/** Periodic sweep for nearing deadlines (placeholder metrics; extend with push in DEV-391). */
export const deadlineSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    const events = await ctx.db.query('events').collect();
    let near = 0;
    for (const e of events) {
      if (e.status === 'open' && e.deadline > now && e.deadline <= horizon) {
        near += 1;
      }
    }
    if (near > 0) {
      console.log(`[cron] Open events with deadline in next 24h: ${near}`);
    }
  },
});
