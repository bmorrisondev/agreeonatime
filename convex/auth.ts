// @ts-nocheck — Run `pnpm convex:dev` to generate `convex/_generated` and enable full types.
import { expo } from '@better-auth/expo';
import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';
import { magicLink } from 'better-auth/plugins';
import { importPKCS8, SignJWT } from 'jose';

import authConfig from './auth.config';
import { components } from './_generated/api';
import { type DataModel } from './_generated/dataModel';
export const authComponent = createClient<DataModel>(components.betterAuth);

async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[auth] Magic link for ${email}: ${url}\n` +
        `Email not sent: set RESEND_API_KEY and RESEND_FROM_EMAIL in the Convex dashboard (see .env.example).`,
    );
    return;
  }
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const hrefAttr = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Agree on a Time sign-in link',
      html: `<p><a href="${hrefAttr}">Sign in to Agree on a Time</a></p><p style="font-size:12px;color:#666;word-break:break-all">${hrefAttr}</p>`,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[auth] Resend failed:', res.status, text);
    throw new Error('Failed to send magic link email');
  }
}

async function appleClientSecret(): Promise<string> {
  const clientId = process.env.APPLE_CLIENT_ID as string;
  const teamId = process.env.APPLE_TEAM_ID as string;
  const keyId = process.env.APPLE_KEY_ID as string;
  const rawKey = process.env.APPLE_PRIVATE_KEY as string;
  const pk = rawKey.replace(/\\n/g, '\n');
  const key = await importPKCS8(pk, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}

function appleConfigured(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY,
  );
}

/** Expo web dev servers — hostnames differ (`localhost` vs `127.0.0.1`); both must be trusted or the browser blocks session fetch (CORS). */
const EXPO_WEB_DEV_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
];

/** Default when Convex `SITE_URL` is unset — cross-domain magic links need the cross-domain plugin so redirects append `?ott=…`. Match your browser origin via `npx convex env set SITE_URL …`. */
const DEFAULT_EXPO_WEB_SITE_URL = 'http://localhost:8081';

export const createAuth = (ctx: GenericCtx<DataModel>): ReturnType<typeof betterAuth> => {
  const convexSite = process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? '';
  /** Origin where Expo web runs (e.g. http://localhost:8081). Set in Convex: `npx convex env set SITE_URL ...` — must match the address bar (localhost vs 127.0.0.1). */
  const webAppSiteUrl = process.env.SITE_URL ?? '';
  /** Required for magic-link → web: `@convex-dev/better-auth` adds `ott` to redirects only when `crossDomain` is registered. */
  const crossDomainSiteUrl =
    webAppSiteUrl.trim().length > 0 ? webAppSiteUrl.trim() : DEFAULT_EXPO_WEB_SITE_URL;
  const origins = [
    ...new Set(
      [
        convexSite,
        webAppSiteUrl,
        ...EXPO_WEB_DEV_ORIGINS,
        'agreeonatime://',
        'exp://',
        'https://appleid.apple.com',
      ].filter(Boolean),
    ),
  ] as string[];

  const plugins: BetterAuthOptions['plugins'] = [
    expo(),
    convex({ authConfig }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
  ];

  plugins.push(crossDomain({ siteUrl: crossDomainSiteUrl }));

  const base: BetterAuthOptions = {
    baseURL: convexSite,
    trustedOrigins: origins,
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: false },
    plugins,
  };

  if (appleConfigured()) {
    base.socialProviders = {
      apple: {
        clientId: process.env.APPLE_CLIENT_ID as string,
        clientSecret: appleClientSecret,
        appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER ?? 'me.brianmm.agreeonatime',
      },
    };
  }

  return betterAuth(base);
};

export const { getAuthUser } = authComponent.clientApi();
