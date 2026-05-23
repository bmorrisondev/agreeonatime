import {
  CALENDAR_ATTRIBUTION_NOTE,
  type CalendarEventInput,
  resolveCalendarEndTimeMs,
} from '@/lib/calendar/calendar-event';

/** Escape text for ICS property values (RFC 5545). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Format UTC instant as `YYYYMMDDTHHMMSSZ`. */
export function formatIcsUtcDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function buildDescription(input: CalendarEventInput): string {
  const extra = input.notes?.trim();
  if (extra != null && extra.length > 0) {
    return `${extra}\n\n${CALENDAR_ATTRIBUTION_NOTE}`;
  }
  return CALENDAR_ATTRIBUTION_NOTE;
}

/**
 * Build a minimal VCALENDAR document for a single timed event.
 * Opening the file on iOS presents Calendar with fields pre-filled (user taps Add).
 */
export function buildIcsCalendarEvent(input: CalendarEventInput, uid: string): string {
  const endMs = resolveCalendarEndTimeMs(input);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agree on a Time//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${formatIcsUtcDateTime(Date.now())}`,
    `DTSTART:${formatIcsUtcDateTime(input.startTimeMs)}`,
    `DTEND:${formatIcsUtcDateTime(endMs)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(buildDescription(input))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}
