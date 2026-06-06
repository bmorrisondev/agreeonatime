import { useCallback, useEffect, useRef, useState } from 'react';

import type { CalendarConflictFetchResult } from '@/lib/calendar/calendar-conflict-types';
import {
  fetchCalendarConflicts,
  isCalendarConflictSupported,
} from '@/lib/calendar/fetch-calendar-conflicts';

export type CalendarConflictStatus =
  | 'idle'
  | 'unsupported'
  | 'loading'
  | 'denied'
  | 'no_calendars'
  | 'ready'
  | 'error';

export interface CalendarConflictState {
  readonly status: CalendarConflictStatus;
  readonly conflictingIndexes: ReadonlySet<number>;
  readonly errorMessage: string | null;
  readonly checked: boolean;
  readonly checkCalendar: () => Promise<void>;
  readonly reset: () => void;
}

const INITIAL_INDEXES: ReadonlySet<number> = new Set();

function resultToState(result: CalendarConflictFetchResult): Pick<
  CalendarConflictState,
  'status' | 'conflictingIndexes' | 'errorMessage'
> {
  switch (result.kind) {
    case 'unsupported':
      return { status: 'unsupported', conflictingIndexes: INITIAL_INDEXES, errorMessage: null };
    case 'denied':
      return { status: 'denied', conflictingIndexes: INITIAL_INDEXES, errorMessage: null };
    case 'no_calendars':
      return {
        status: 'no_calendars',
        conflictingIndexes: INITIAL_INDEXES,
        errorMessage: null,
      };
    case 'ok':
      return {
        status: 'ready',
        conflictingIndexes: new Set(result.conflictingIndexes),
        errorMessage: null,
      };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

export function useCalendarConflicts(slotStartsMs: readonly number[]): CalendarConflictState {
  const [status, setStatus] = useState<CalendarConflictStatus>('idle');
  const [conflictingIndexes, setConflictingIndexes] = useState<ReadonlySet<number>>(INITIAL_INDEXES);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const requestIdRef = useRef(0);
  const slotStartsKeyRef = useRef<string>('');

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setStatus('idle');
    setConflictingIndexes(INITIAL_INDEXES);
    setErrorMessage(null);
    setChecked(false);
    slotStartsKeyRef.current = '';
  }, []);

  const runCheck = useCallback(async (slotStarts: readonly number[]) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!isCalendarConflictSupported()) {
      setStatus('unsupported');
      setConflictingIndexes(INITIAL_INDEXES);
      setErrorMessage(null);
      setChecked(true);
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const result = await fetchCalendarConflicts(slotStarts);
      if (requestIdRef.current !== requestId) {
        return;
      }
      const next = resultToState(result);
      setStatus(next.status);
      setConflictingIndexes(next.conflictingIndexes);
      setErrorMessage(next.errorMessage);
      setChecked(true);
      slotStartsKeyRef.current = slotStarts.join(',');
    } catch (e: unknown) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      console.warn('[calendar-conflicts] check failed', e);
      setStatus('error');
      setConflictingIndexes(INITIAL_INDEXES);
      setErrorMessage('Could not read your calendar. Try again later.');
      setChecked(true);
    }
  }, []);

  const checkCalendar = useCallback(async () => {
    await runCheck(slotStartsMs);
  }, [runCheck, slotStartsMs]);

  const slotStartsKey = slotStartsMs.join(',');

  useEffect(() => {
    if (!checked || status === 'idle' || status === 'loading' || status === 'unsupported') {
      return;
    }
    if (slotStartsKey === slotStartsKeyRef.current) {
      return;
    }
    if (!isCalendarConflictSupported()) {
      return;
    }
    void runCheck(slotStartsMs);
  }, [checked, runCheck, slotStartsKey, slotStartsMs, status]);

  return {
    status,
    conflictingIndexes,
    errorMessage,
    checked,
    checkCalendar,
    reset,
  };
}
