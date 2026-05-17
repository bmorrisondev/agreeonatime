/**
 * Non-production builds set `EXPO_PUBLIC_DEV_TOOLS=true` (EAS preview/dev, Vercel preview, `.env.local`).
 * Omit on production App Store / Vercel production so Settings hides notifications + developer sections.
 */
export function isDevToolsEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_DEV_TOOLS;
  if (raw == null) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}
