/** Default event length when adding to calendar (no end time stored on events yet). */
export const CALENDAR_DEFAULT_DURATION_MS = 60 * 60 * 1000;

export const CALENDAR_ATTRIBUTION_NOTE =
  'Scheduled with Agree on a Time — https://agreeonatime.com';

export interface CalendarEventInput {
  readonly title: string;
  readonly startTimeMs: number;
  /** Defaults to {@link CALENDAR_DEFAULT_DURATION_MS} after start. */
  readonly endTimeMs?: number;
  readonly notes?: string;
}

export function resolveCalendarEndTimeMs(input: CalendarEventInput): number {
  return input.endTimeMs ?? input.startTimeMs + CALENDAR_DEFAULT_DURATION_MS;
}
