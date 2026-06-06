export type CalendarConflictFetchResult =
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'no_calendars' }
  | { readonly kind: 'ok'; readonly conflictingIndexes: readonly number[] };
