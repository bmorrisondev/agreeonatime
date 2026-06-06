import { CALENDAR_DEFAULT_DURATION_MS } from '@/lib/calendar/calendar-event';
import { EVENT_HOUR_MS } from '@/lib/events/event-form';

export interface TimeRangeMs {
  readonly startMs: number;
  readonly endMs: number;
}

export interface CalendarBusyEvent {
  readonly startMs: number;
  readonly endMs: number;
  readonly allDay: boolean;
}

/** Proposed slot treated as a one-hour block (matches add-to-calendar default). */
export function proposedSlotRangeMs(slotStartMs: number): TimeRangeMs {
  return {
    startMs: slotStartMs,
    endMs: slotStartMs + CALENDAR_DEFAULT_DURATION_MS,
  };
}

/** Query window for Calendar.getEventsAsync: slot range ±1 hour. */
export function queryWindowForSlotMs(slotStartMs: number): TimeRangeMs {
  const slot = proposedSlotRangeMs(slotStartMs);
  return {
    startMs: slot.startMs - EVENT_HOUR_MS,
    endMs: slot.endMs + EVENT_HOUR_MS,
  };
}

export function rangesOverlapMs(a: TimeRangeMs, b: TimeRangeMs): boolean {
  return a.startMs < b.endMs && a.endMs > b.startMs;
}

export function eventToRangeMs(event: CalendarBusyEvent): TimeRangeMs {
  return { startMs: event.startMs, endMs: event.endMs };
}

/** Returns slot indexes (0-based) that overlap at least one busy calendar event. */
export function findConflictingSlotIndexes(
  slotStartsMs: readonly number[],
  busyEvents: readonly CalendarBusyEvent[],
): number[] {
  if (slotStartsMs.length === 0 || busyEvents.length === 0) {
    return [];
  }

  const eventRanges = busyEvents.map(eventToRangeMs);
  const conflicts: number[] = [];

  for (let index = 0; index < slotStartsMs.length; index += 1) {
    const slotRange = proposedSlotRangeMs(slotStartsMs[index] ?? 0);
    const overlaps = eventRanges.some((eventRange) => rangesOverlapMs(slotRange, eventRange));
    if (overlaps) {
      conflicts.push(index);
    }
  }

  return conflicts;
}

/** Min/max query window covering all slots (each expanded ±1 hour). */
export function combinedQueryWindowMs(slotStartsMs: readonly number[]): TimeRangeMs | null {
  if (slotStartsMs.length === 0) {
    return null;
  }

  let startMs = Number.POSITIVE_INFINITY;
  let endMs = Number.NEGATIVE_INFINITY;

  for (const slotStart of slotStartsMs) {
    const window = queryWindowForSlotMs(slotStart);
    startMs = Math.min(startMs, window.startMs);
    endMs = Math.max(endMs, window.endMs);
  }

  return { startMs, endMs };
}
