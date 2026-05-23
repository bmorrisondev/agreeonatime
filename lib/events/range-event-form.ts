import { AVAILABILITY_BLOCK_MS, type RangeWindow } from '@/lib/availability/grid';

export const RANGE_MAX_WINDOWS = 14;
export const RANGE_MIN_WINDOW_MS = AVAILABILITY_BLOCK_MS;
export const RANGE_MAX_SPAN_MS = 14 * 24 * 60 * 60 * 1000;

export interface RangeEventFormInput {
  readonly title: string;
  readonly deadline: number;
  readonly rangeWindows: readonly RangeWindow[];
}

export function buildDefaultRangeEvent(): { rangeWindows: RangeWindow[]; deadline: number } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const nextSat = new Date(now);
  const dow = nextSat.getDay();
  const daysUntilSat = (6 - dow + 7) % 7 || 7;
  nextSat.setDate(nextSat.getDate() + daysUntilSat);
  nextSat.setHours(9, 0, 0, 0);
  const satStart = nextSat.getTime();
  const satEnd = satStart + 12 * 60 * 60 * 1000;
  const sunStart = satStart + day;
  const sunEnd = sunStart + 12 * 60 * 60 * 1000;
  const deadline = satStart - 2 * 60 * 60 * 1000;
  return {
    rangeWindows: [
      { startBound: satStart, endBound: satEnd },
      { startBound: sunStart, endBound: sunEnd },
    ],
    deadline,
  };
}

export function validateRangeEventForm(params: RangeEventFormInput): string | null {
  if (params.title.trim().length === 0) {
    return 'Title is required';
  }
  const now = Date.now();
  if (params.deadline <= now) {
    return 'Voting deadline must be in the future';
  }
  if (params.rangeWindows.length === 0) {
    return 'Add at least one availability window';
  }
  if (params.rangeWindows.length > RANGE_MAX_WINDOWS) {
    return `At most ${String(RANGE_MAX_WINDOWS)} windows`;
  }
  let earliest = Infinity;
  let latest = -Infinity;
  for (const w of params.rangeWindows) {
    if (w.endBound <= w.startBound) {
      return 'Each window must end after it starts';
    }
    if (w.endBound - w.startBound < RANGE_MIN_WINDOW_MS) {
      return 'Each window must be at least 30 minutes';
    }
    earliest = Math.min(earliest, w.startBound);
    latest = Math.max(latest, w.endBound);
  }
  if (latest - earliest > RANGE_MAX_SPAN_MS) {
    return 'Availability span cannot exceed 14 days';
  }
  if (params.deadline >= earliest) {
    return 'Deadline must be before the first availability window';
  }
  return null;
}
