export interface CalendarSourceRef {
  readonly name?: string;
  readonly type?: string;
}

export interface AppleCalendarRef {
  readonly id: string;
  readonly source?: CalendarSourceRef;
}

/** On-device Apple / iCloud calendars (excludes linked Google/Exchange at launch). */
export function isAppleCalendar(cal: AppleCalendarRef): boolean {
  const sourceName = (cal.source?.name ?? '').toLowerCase();

  if (sourceName.includes('gmail') || sourceName.includes('google')) {
    return false;
  }
  if (sourceName.includes('outlook') || sourceName.includes('exchange')) {
    return false;
  }

  return true;
}

export function filterAppleCalendarIds(calendars: readonly AppleCalendarRef[]): string[] {
  return calendars.filter(isAppleCalendar).map((cal) => cal.id);
}
