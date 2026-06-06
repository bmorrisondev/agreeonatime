import type { CalendarBusyEvent } from '@/lib/calendar/busy-times';
import { combinedQueryWindowMs, findConflictingSlotIndexes } from '@/lib/calendar/busy-times';
import type { CalendarConflictFetchResult } from '@/lib/calendar/calendar-conflict-types';

export function parseCalendarEventDates(
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
  allDay: boolean,
): CalendarBusyEvent | null {
  if (startDate == null || endDate == null) {
    return null;
  }
  const startMs = typeof startDate === 'string' ? Date.parse(startDate) : startDate.getTime();
  const endMs = typeof endDate === 'string' ? Date.parse(endDate) : endDate.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }
  return { startMs, endMs, allDay };
}

export function buildConflictResult(
  slotStartsMs: readonly number[],
  busyEvents: readonly CalendarBusyEvent[],
): CalendarConflictFetchResult {
  const conflictingIndexes = findConflictingSlotIndexes(slotStartsMs, busyEvents);
  return { kind: 'ok', conflictingIndexes };
}

export function queryWindowForSlots(slotStartsMs: readonly number[]): { start: Date; end: Date } | null {
  const window = combinedQueryWindowMs(slotStartsMs);
  if (window == null) {
    return null;
  }
  return { start: new Date(window.startMs), end: new Date(window.endMs) };
}
