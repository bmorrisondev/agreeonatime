import * as Calendar from 'expo-calendar/legacy';

import { filterAppleCalendarIds } from '@/lib/calendar/apple-calendars';
import type { CalendarBusyEvent } from '@/lib/calendar/busy-times';
import {
  buildConflictResult,
  parseCalendarEventDates,
  queryWindowForSlots,
} from '@/lib/calendar/calendar-conflict-helpers';
import type { CalendarConflictFetchResult } from '@/lib/calendar/calendar-conflict-types';

export type { CalendarConflictFetchResult } from '@/lib/calendar/calendar-conflict-types';

export function isCalendarConflictSupported(): boolean {
  return true;
}

export async function fetchCalendarConflicts(
  slotStartsMs: readonly number[],
): Promise<CalendarConflictFetchResult> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted && permission.status !== 'granted') {
    return { kind: 'denied' };
  }

  const queryWindow = queryWindowForSlots(slotStartsMs);
  if (queryWindow == null) {
    return { kind: 'ok', conflictingIndexes: [] };
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarIds = filterAppleCalendarIds(calendars);
  if (calendarIds.length === 0) {
    return { kind: 'no_calendars' };
  }

  const events = await Calendar.getEventsAsync(calendarIds, queryWindow.start, queryWindow.end);
  const busyEvents: CalendarBusyEvent[] = events
    .map((event) => parseCalendarEventDates(event.startDate, event.endDate, event.allDay))
    .filter((event): event is CalendarBusyEvent => event != null);

  return buildConflictResult(slotStartsMs, busyEvents);
}
