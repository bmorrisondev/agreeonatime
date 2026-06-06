export interface CalendarIosDownloadCtaProps {
  readonly layout?: 'chip' | 'banner';
}

/** Native: calendar CTA is web-only; use CheckCalendarSection on iOS instead. */
export function CalendarIosDownloadCta(_props: CalendarIosDownloadCtaProps): null {
  return null;
}
