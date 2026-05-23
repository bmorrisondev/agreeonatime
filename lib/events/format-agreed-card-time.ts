/** Prominent date/time line for the agreed share card (e.g. Saturday, June 7 · 7:00 PM). */
export function formatAgreedCardTime(startTimeMs: number): string {
  const date = new Date(startTimeMs);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  const monthDay = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${weekday}, ${monthDay} · ${time}`;
}
