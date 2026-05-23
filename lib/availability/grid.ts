/** 30-minute availability blocks (DEV-434). */

export const AVAILABILITY_BLOCK_MS = 30 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RangeWindow {
  readonly startBound: number;
  readonly endBound: number;
}

export interface GridSpec {
  /** UTC midnight of the first column day. */
  readonly gridStartMs: number;
  readonly dayCount: number;
  /** Ms from local midnight to the first row block. */
  readonly dailyStartMs: number;
  readonly blocksPerDay: number;
  readonly totalBlocks: number;
}

export interface BestWindowSuggestion {
  readonly startBlockIndex: number;
  readonly lengthBlocks: number;
  readonly overlapCount: number;
  readonly startMs: number;
  readonly endMs: number;
}

function utcMidnightMs(instantMs: number): number {
  const d = new Date(instantMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function msFromUtcMidnight(instantMs: number): number {
  return instantMs - utcMidnightMs(instantMs);
}

/** Builds a When2Meet-style grid from one or more range windows. */
export function buildGridSpec(windows: readonly RangeWindow[]): GridSpec | null {
  if (windows.length === 0) {
    return null;
  }
  let minDay = Infinity;
  let maxDay = -Infinity;
  let dailyStartMs = Infinity;
  let dailyEndMs = -Infinity;

  for (const w of windows) {
    if (w.endBound <= w.startBound) {
      continue;
    }
    const dayStart = utcMidnightMs(w.startBound);
    const dayEnd = utcMidnightMs(w.endBound);
    minDay = Math.min(minDay, dayStart);
    maxDay = Math.max(maxDay, dayEnd);
    dailyStartMs = Math.min(dailyStartMs, msFromUtcMidnight(w.startBound));
    dailyEndMs = Math.max(dailyEndMs, msFromUtcMidnight(w.endBound));
  }

  if (!Number.isFinite(minDay) || !Number.isFinite(dailyStartMs)) {
    return null;
  }

  dailyStartMs = Math.floor(dailyStartMs / AVAILABILITY_BLOCK_MS) * AVAILABILITY_BLOCK_MS;
  dailyEndMs = Math.ceil(dailyEndMs / AVAILABILITY_BLOCK_MS) * AVAILABILITY_BLOCK_MS;
  if (dailyEndMs <= dailyStartMs) {
    return null;
  }

  const blocksPerDay = Math.floor((dailyEndMs - dailyStartMs) / AVAILABILITY_BLOCK_MS);
  const dayCount = Math.floor((maxDay - minDay) / MS_PER_DAY) + 1;

  return {
    gridStartMs: minDay,
    dayCount,
    dailyStartMs,
    blocksPerDay,
    totalBlocks: dayCount * blocksPerDay,
  };
}

export function blockIndexToIntervalMs(spec: GridSpec, blockIndex: number): { startMs: number; endMs: number } {
  const dayIndex = Math.floor(blockIndex / spec.blocksPerDay);
  const slotInDay = blockIndex % spec.blocksPerDay;
  const startMs = spec.gridStartMs + dayIndex * MS_PER_DAY + spec.dailyStartMs + slotInDay * AVAILABILITY_BLOCK_MS;
  return { startMs, endMs: startMs + AVAILABILITY_BLOCK_MS };
}

/** True when [blockStart, blockEnd) overlaps [winStart, winEnd). */
export function blockOverlapsWindow(
  blockStartMs: number,
  blockEndMs: number,
  winStart: number,
  winEnd: number,
): boolean {
  return blockStartMs < winEnd && blockEndMs > winStart;
}

export function isBlockInAnyWindow(
  spec: GridSpec,
  blockIndex: number,
  windows: readonly RangeWindow[],
): boolean {
  if (blockIndex < 0 || blockIndex >= spec.totalBlocks) {
    return false;
  }
  const { startMs, endMs } = blockIndexToIntervalMs(spec, blockIndex);
  return windows.some((w) => blockOverlapsWindow(startMs, endMs, w.startBound, w.endBound));
}

export function findBestWindow(
  overlapCounts: readonly number[],
  spec: GridSpec,
  minLengthBlocks: number = 2,
): BestWindowSuggestion | null {
  if (overlapCounts.length === 0) {
    return null;
  }
  let best: BestWindowSuggestion | null = null;

  let runStart = 0;
  let runSum = 0;
  for (let i = 0; i <= overlapCounts.length; i++) {
    const count = i < overlapCounts.length ? overlapCounts[i]! : 0;
    if (count > 0 && i < overlapCounts.length) {
      if (runSum === 0) {
        runStart = i;
      }
      runSum += count;
    } else if (runSum > 0) {
      const length = i - runStart;
      if (length >= minLengthBlocks) {
        const avg = runSum / length;
        if (best == null || avg > best.overlapCount / best.lengthBlocks) {
          const { startMs } = blockIndexToIntervalMs(spec, runStart);
          const { endMs } = blockIndexToIntervalMs(spec, i - 1);
          best = {
            startBlockIndex: runStart,
            lengthBlocks: length,
            overlapCount: Math.round(runSum / length),
            startMs,
            endMs,
          };
        }
      }
      runSum = 0;
    }
  }

  return best;
}

export function formatBlockTimeLabel(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
