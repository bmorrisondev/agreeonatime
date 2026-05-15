/**
 * Copy helpers for owner home list (DEV-386). Replace with i18n when DEV-394 lands.
 *
 * Hermes does not implement Intl.RelativeTimeFormat; use a small English fallback.
 */
function enRelativeMinutes(diffMinutes: number): string {
  if (diffMinutes === 0) {
    return 'now';
  }
  const n = Math.abs(diffMinutes);
  const unit = n === 1 ? 'minute' : 'minutes';
  return diffMinutes > 0 ? `in ${n} ${unit}` : `${n} ${unit} ago`;
}

function enRelativeHours(diffHours: number): string {
  if (diffHours === 0) {
    return 'now';
  }
  const n = Math.abs(diffHours);
  const unit = n === 1 ? 'hour' : 'hours';
  return diffHours > 0 ? `in ${n} ${unit}` : `${n} ${unit} ago`;
}

function enRelativeDays(diffDays: number): string {
  if (diffDays === 0) {
    return 'today';
  }
  if (diffDays === 1) {
    return 'tomorrow';
  }
  if (diffDays === -1) {
    return 'yesterday';
  }
  const n = Math.abs(diffDays);
  const unit = n === 1 ? 'day' : 'days';
  return diffDays > 0 ? `in ${n} ${unit}` : `${n} ${unit} ago`;
}

export function formatDeadlineLine(deadlineMs: number, nowMs: number): string {
  const diffMs = deadlineMs - nowMs;
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) {
    return enRelativeMinutes(diffMinutes);
  }
  const diffHours = Math.round(diffMs / 3600000);
  if (Math.abs(diffHours) < 48) {
    return enRelativeHours(diffHours);
  }
  const diffDays = Math.round(diffMs / 86400000);
  return enRelativeDays(diffDays);
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

/** Proposed time in the device (owner) timezone with short zone label. */
export function formatTimeslotWithTimezone(startTimeMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(startTimeMs));
}
