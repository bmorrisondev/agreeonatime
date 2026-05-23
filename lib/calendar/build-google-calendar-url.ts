import {
  CALENDAR_ATTRIBUTION_NOTE,
  type CalendarEventInput,
  resolveCalendarEndTimeMs,
} from '@/lib/calendar/calendar-event';
import { formatIcsUtcDateTime } from '@/lib/calendar/build-ics';

function buildGoogleCalendarDetails(input: CalendarEventInput): string {
  const extra = input.notes?.trim();
  if (extra != null && extra.length > 0) {
    return `${extra}\n\n${CALENDAR_ATTRIBUTION_NOTE}`;
  }
  return CALENDAR_ATTRIBUTION_NOTE;
}

/** Google Calendar “template” URL (works on web and as a cross-platform fallback). */
export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const endMs = resolveCalendarEndTimeMs(input);
  const dates = `${formatIcsUtcDateTime(input.startTimeMs)}/${formatIcsUtcDateTime(endMs)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates,
    details: buildGoogleCalendarDetails(input),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
