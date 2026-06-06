import type { CalendarConflictFetchResult } from '@/lib/calendar/calendar-conflict-types';

export type { CalendarConflictFetchResult } from '@/lib/calendar/calendar-conflict-types';

export function isCalendarConflictSupported(): boolean {
  return false;
}

export async function fetchCalendarConflicts(
  _slotStartsMs: readonly number[],
): Promise<CalendarConflictFetchResult> {
  return { kind: 'unsupported' };
}
