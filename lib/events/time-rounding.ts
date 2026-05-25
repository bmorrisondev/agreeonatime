/** Default grid for event timeslots and voting deadlines (DEV-446). */
export const EVENT_TIME_ROUNDING_MINUTES = 15;

/** `DateTimePicker` minute snap interval (same as rounding grid). */
export const EVENT_TIME_MINUTE_INTERVAL = EVENT_TIME_ROUNDING_MINUTES;

const MS_PER_MINUTE = 60_000;

/** Round epoch ms to the nearest interval (default 15 minutes). */
export function roundTimeMs(
  ms: number,
  intervalMinutes: number = EVENT_TIME_ROUNDING_MINUTES,
): number {
  const intervalMs = intervalMinutes * MS_PER_MINUTE;
  return Math.round(ms / intervalMs) * intervalMs;
}

export function roundDate(
  date: Date,
  intervalMinutes: number = EVENT_TIME_ROUNDING_MINUTES,
): Date {
  return new Date(roundTimeMs(date.getTime(), intervalMinutes));
}
