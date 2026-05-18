/**
 * Developer-only Settings sections (design system, onboarding preview).
 * Enabled when `EXPO_PUBLIC_DEV_TOOLS=true` on non-production builds (EAS preview/dev,
 * Vercel preview, `.env.local`). Production sets `EXPO_PUBLIC_APP_ENV=production` and omits
 * dev tools — including local `eas build --profile production` (see deploy-testflight-local.sh).
 */
export function isProductionApp(): boolean {
  const env = process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase();
  return env === 'production';
}

export function isDevToolsEnabled(): boolean {
  if (isProductionApp()) {
    return false;
  }
  const raw = process.env.EXPO_PUBLIC_DEV_TOOLS;
  if (raw == null) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}
