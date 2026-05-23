// @ts-nocheck — Run `pnpm convex:dev` for generated types.
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

import { voterKey } from './subscriptionLimits';

export const BLOCK_MS = 30 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RangeWindow {
  startBound: number;
  endBound: number;
}

export interface GridSpec {
  gridStartMs: number;
  dayCount: number;
  dailyStartMs: number;
  blocksPerDay: number;
  totalBlocks: number;
}

function utcMidnightMs(instantMs: number): number {
  const d = new Date(instantMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function msFromUtcMidnight(instantMs: number): number {
  return instantMs - utcMidnightMs(instantMs);
}

export function buildGridSpecFromWindows(windows: readonly RangeWindow[]): GridSpec | null {
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

  if (!Number.isFinite(minDay)) {
    return null;
  }

  dailyStartMs = Math.floor(dailyStartMs / BLOCK_MS) * BLOCK_MS;
  dailyEndMs = Math.ceil(dailyEndMs / BLOCK_MS) * BLOCK_MS;
  if (dailyEndMs <= dailyStartMs) {
    return null;
  }

  const blocksPerDay = Math.floor((dailyEndMs - dailyStartMs) / BLOCK_MS);
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
  const startMs = spec.gridStartMs + dayIndex * MS_PER_DAY + spec.dailyStartMs + slotInDay * BLOCK_MS;
  return { startMs, endMs: startMs + BLOCK_MS };
}

function blockOverlapsWindow(blockStartMs: number, blockEndMs: number, winStart: number, winEnd: number): boolean {
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

export function rangeWindowsFromTimeslots(
  slots: readonly Pick<Doc<'timeslots'>, 'type' | 'startBound' | 'endBound' | 'startTime' | 'endTime'>[],
): RangeWindow[] {
  const out: RangeWindow[] = [];
  for (const slot of slots) {
    if (slot.type === 'range' && slot.startBound != null && slot.endBound != null) {
      out.push({ startBound: slot.startBound, endBound: slot.endBound });
    }
  }
  return out;
}

export function eventSchedulingMode(
  event: Pick<Doc<'events'>, 'schedulingMode'>,
): 'discrete' | 'range' {
  return event.schedulingMode === 'range' ? 'range' : 'discrete';
}

export async function loadRangeWindowsForEvent(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<'events'>,
): Promise<RangeWindow[]> {
  const timeslots = await ctx.db
    .query('timeslots')
    .withIndex('by_event', (q) => q.eq('eventId', eventId))
    .collect();
  return rangeWindowsFromTimeslots(timeslots);
}

export async function deleteAvailabilityForEvent(ctx: MutationCtx, eventId: Id<'events'>): Promise<void> {
  const BATCH = 256;
  while (true) {
    const rows = await ctx.db
      .query('availabilityBlocks')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .take(BATCH);
    if (rows.length === 0) {
      break;
    }
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }
}

export function computeOverlapCounts(
  blocks: readonly Pick<Doc<'availabilityBlocks'>, 'blockIndex' | 'available' | 'voterName' | 'voterUserId' | 'voterSessionId'>[],
  spec: GridSpec,
): number[] {
  const counts = new Array<number>(spec.totalBlocks).fill(0);
  const votersByBlock = new Map<number, Set<string>>();

  for (const row of blocks) {
    if (!row.available || row.blockIndex < 0 || row.blockIndex >= spec.totalBlocks) {
      continue;
    }
    const key = voterKey(row);
    let set = votersByBlock.get(row.blockIndex);
    if (!set) {
      set = new Set();
      votersByBlock.set(row.blockIndex, set);
    }
    set.add(key);
  }

  for (const [blockIndex, voters] of votersByBlock) {
    counts[blockIndex] = voters.size;
  }
  return counts;
}

export function findBestWindowSuggestion(
  overlapCounts: readonly number[],
  spec: GridSpec,
): {
  startBlockIndex: number;
  lengthBlocks: number;
  overlapCount: number;
  startMs: number;
  endMs: number;
} | null {
  let best: {
    startBlockIndex: number;
    lengthBlocks: number;
    overlapCount: number;
    startMs: number;
    endMs: number;
  } | null = null;

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
      if (length >= 1) {
        const avg = runSum / length;
        if (best == null || avg > best.overlapCount) {
          const { startMs } = blockIndexToIntervalMs(spec, runStart);
          const { endMs } = blockIndexToIntervalMs(spec, i - 1);
          best = {
            startBlockIndex: runStart,
            lengthBlocks: length,
            overlapCount: Math.round(avg),
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

export const rangeWindowValidator = v.object({
  startBound: v.number(),
  endBound: v.number(),
});

export const gridSpecValidator = v.object({
  gridStartMs: v.number(),
  dayCount: v.number(),
  dailyStartMs: v.number(),
  blocksPerDay: v.number(),
  totalBlocks: v.number(),
});
