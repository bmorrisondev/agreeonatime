// @ts-nocheck — Run `pnpm convex:dev` to generate `convex/_generated` and enable full types.
import { expo } from '@better-auth/expo';
import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';
import { emailOTP, magicLink } from 'better-auth/plugins';
import { importPKCS8, SignJWT } from 'jose';

import authConfig from './auth.config';
import { components } from './_generated/api';
import { type DataModel } from './_generated/dataModel';
import { EXPO_WEB_DEV_ORIGINS, siteUrlOrigins, webAuthOrigins } from './site_origins';

export const authComponent = createClient<DataModel>(components.betterAuth);

async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[auth] Magic link for ${email}: ${url}`);
    return;
  }
  const from = 'no-reply@agreeonatime.com';
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
      html: `<p>Click to sign in:</p><p><a href="${url}">${url}</a></p>`,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[auth] Resend failed:', res.status, text);
    throw new Error('Failed to send magic link email');
  }
}

async function sendVerificationOTPEmail(
  email: string,
  otp: string,
  type: 'sign-in' | 'email-verification' | 'forget-password',
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[auth] OTP for ${email} (${type}): ${otp}`);
    return;
  }
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  const subjectByType: Record<typeof type, string> = {
    'sign-in': 'Your Agree on a Time sign-in code',
    'email-verification': 'Verify your email for Agree on a Time',
    'forget-password': 'Reset your Agree on a Time password',
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: subjectByType[type],
      html: `<p>Your verification code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in 5 minutes.</p>`,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[auth] Resend OTP failed:', res.status, text);
    throw new Error('Failed to send verification email');
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

export const createAuth = (ctx: GenericCtx<DataModel>): ReturnType<typeof betterAuth> => {
  const convexSite = process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? '';
  /** Production / preview web origins from `SITE_URL` (comma-separated supported). */
  const siteUrls = siteUrlOrigins();
  const primarySiteUrl = siteUrls[0] ?? '';
  const crossDomainSiteUrl =
    primarySiteUrl.length > 0 ? primarySiteUrl : EXPO_WEB_DEV_ORIGINS[0];

  const origins = [
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

  const plugins: BetterAuthOptions['plugins'] = [
    expo(),
    convex({ authConfig }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    crossDomain({ siteUrl: crossDomainSiteUrl }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendVerificationOTPEmail(email, otp, type);
      },
    }),
  ];

  const base: BetterAuthOptions = {
    baseURL: convexSite,
    trustedOrigins: origins,
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    user: { deleteUser: { enabled: true } },
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
