/**
 * Copy helpers for owner home list (DEV-386). Replace with i18n when DEV-394 lands.
 */
export function formatDeadlineLine(deadlineMs: number, nowMs: number): string {
  const diffMs = deadlineMs - nowMs;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffMs / 3600000);
  if (Math.abs(diffHours) < 48) {
    return rtf.format(diffHours, 'hour');
  }
  const diffDays = Math.round(diffMs / 86400000);
  return rtf.format(diffDays, 'day');
}

export function formatDateTimeMs(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDecidedTime(startTimeMs: number): string {
  return `Decided: ${formatDateTimeMs(startTimeMs)}`;
}

export function formatVoteSummary(yes: number, no: number): string {
  return `${yes} yes · ${no} no`;
}
