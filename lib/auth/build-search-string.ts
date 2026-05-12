/**
 * Serialize Expo Router global search params for `Redirect` / `href` query strings.
 */
export function buildSearchString(query: Record<string, string | string[] | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) {
      continue;
    }
    const values = Array.isArray(v) ? v : [v];
    for (const val of values) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
