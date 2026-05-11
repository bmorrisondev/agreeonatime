import { strings } from '@/lib/i18n/strings';

export type MessageKey = keyof typeof strings;

/**
 * Minimal i18n helper (English-only catalog). Replace `strings` / add locale switch later.
 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let out: string = strings[key];
  if (vars != null) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return out;
}
