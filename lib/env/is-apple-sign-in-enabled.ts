/**
 * Sign in with Apple (v1.0: disabled for App Store review — email/password only).
 * Set `EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED=true` when Apple SSO is ready to ship.
 */
export function isAppleSignInEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED;
  if (raw == null) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}
