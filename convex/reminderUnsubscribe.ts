// @ts-nocheck — Run `pnpm convex:dev` for generated types.

const TOKEN_SEPARATOR = '.';

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function createReminderUnsubscribeToken(
  email: string,
  eventId: string,
): Promise<string | null> {
  const secret = process.env.REMINDER_UNSUBSCRIBE_SECRET?.trim();
  if (secret == null || secret.length === 0) {
    return null;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const payload = `${normalizedEmail}${TOKEN_SEPARATOR}${eventId}`;
  const signature = await hmacSha256(secret, payload);
  return `${base64UrlEncode(new TextEncoder().encode(payload))}${TOKEN_SEPARATOR}${base64UrlEncode(signature)}`;
}

export async function parseReminderUnsubscribeToken(
  token: string,
): Promise<{ email: string; eventId: string } | null> {
  const secret = process.env.REMINDER_UNSUBSCRIBE_SECRET?.trim();
  if (secret == null || secret.length === 0) {
    return null;
  }
  const parts = token.split(TOKEN_SEPARATOR);
  if (parts.length !== 2) {
    return null;
  }
  const [encodedPayload, encodedSignature] = parts;
  const payloadBytes = base64UrlDecode(encodedPayload);
  const payload = new TextDecoder().decode(payloadBytes);
  const payloadParts = payload.split(TOKEN_SEPARATOR);
  if (payloadParts.length !== 2) {
    return null;
  }
  const [email, eventId] = payloadParts;
  if (email.length === 0 || eventId.length === 0) {
    return null;
  }
  const expected = await hmacSha256(secret, payload);
  const actual = base64UrlDecode(encodedSignature);
  if (!timingSafeEqual(expected, actual)) {
    return null;
  }
  return { email, eventId };
}

export function buildReminderUnsubscribeUrl(token: string): string {
  const site =
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL?.trim() ??
    process.env.CONVEX_SITE_URL?.trim() ??
    'https://app.agreeonatime.com';
  return `${site}/unsubscribe?token=${encodeURIComponent(token)}`;
}
