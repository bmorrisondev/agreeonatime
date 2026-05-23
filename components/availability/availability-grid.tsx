import type { ReactElement } from 'react';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  AVAILABILITY_BLOCK_MS,
  blockIndexToIntervalMs,
  type GridSpec,
  isBlockInAnyWindow,
  type RangeWindow,
} from '@/lib/availability/grid';

const ROW_MIN_HEIGHT = 44;

export interface AvailabilityGridProps {
  readonly gridSpec: GridSpec;
  readonly rangeWindows: readonly RangeWindow[];
  readonly selectedBlocks: ReadonlySet<number>;
  /** Per-block overlap count for owner heat map (optional). */
  readonly overlapCounts?: readonly number[];
  readonly readOnly?: boolean;
  readonly onToggleBlock?: (blockIndex: number) => void;
  /** Owner: tap to pick winning block. */
  readonly onPickBlock?: (blockIndex: number) => void;
  readonly maxOverlap?: number;
}

function formatDayHeader(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatRowTime(spec: GridSpec, rowInDay: number): string {
  const ms = spec.gridStartMs + spec.dailyStartMs + rowInDay * AVAILABILITY_BLOCK_MS;
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function heatOpacity(count: number, max: number): number {
  if (max <= 0 || count <= 0) {
    return 0;
  }
  return 0.15 + 0.75 * (count / max);
}

export function AvailabilityGrid({
  gridSpec,
  rangeWindows,
  selectedBlocks,
  overlapCounts,
  readOnly = false,
  onToggleBlock,
  onPickBlock,
  maxOverlap: maxOverlapProp,
}: AvailabilityGridProps): ReactElement {
  const maxOverlap = useMemo(() => {
    if (maxOverlapProp != null) {
      return maxOverlapProp;
    }
    if (overlapCounts == null) {
      return 0;
    }
    return Math.max(0, ...overlapCounts);
  }, [maxOverlapProp, overlapCounts]);

  const dayHeaders = useMemo(() => {
    const headers: string[] = [];
    for (let d = 0; d < gridSpec.dayCount; d++) {
      headers.push(formatDayHeader(gridSpec.gridStartMs + d * 24 * 60 * 60 * 1000));
    }
    return headers;
  }, [gridSpec]);

  const handleCell = useCallback(
    (blockIndex: number) => {
      if (readOnly) {
        return;
      }
      if (onPickBlock != null) {
        onPickBlock(blockIndex);
        return;
      }
      onToggleBlock?.(blockIndex);
    },
    [onPickBlock, onToggleBlock, readOnly],
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator className="mt-2">
      <View>
        <View className="flex-row">
          <View style={{ width: 56 }} />
          {dayHeaders.map((label, d) => (
            <View key={`day-h-${String(d)}`} style={{ width: 52 }} className="px-0.5">
              <Text
                allowFontScaling
                className="text-center text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                numberOfLines={2}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        {Array.from({ length: gridSpec.blocksPerDay }, (_, rowInDay) => (
          <View key={`row-${String(rowInDay)}`} className="flex-row items-stretch" style={{ minHeight: ROW_MIN_HEIGHT }}>
            <View style={{ width: 56 }} className="justify-center pr-1">
              <Text allowFontScaling className="text-right text-[10px] text-neutral-500 dark:text-neutral-500">
                {formatRowTime(gridSpec, rowInDay)}
              </Text>
            </View>
            {Array.from({ length: gridSpec.dayCount }, (_, dayIndex) => {
              const blockIndex = dayIndex * gridSpec.blocksPerDay + rowInDay;
              const inWindow = isBlockInAnyWindow(gridSpec, blockIndex, rangeWindows);
              const selected = selectedBlocks.has(blockIndex);
              const overlap = overlapCounts?.[blockIndex] ?? 0;
              const { startMs } = blockIndexToIntervalMs(gridSpec, blockIndex);
              const timeLabel = new Date(startMs).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

              if (!inWindow) {
                return (
                  <View
                    key={`cell-${String(blockIndex)}`}
                    style={{ width: 52, minHeight: ROW_MIN_HEIGHT }}
                    className="m-0.5 rounded bg-neutral-100 dark:bg-neutral-900"
                    accessibilityElementsHidden
                  />
                );
              }

              const heatAlpha = overlapCounts != null ? heatOpacity(overlap, maxOverlap) : 0;
              const bg =
                overlapCounts != null && overlap > 0
                  ? `rgba(255, 107, 92, ${String(heatAlpha)})`
                  : selected
                    ? '#86efac'
                    : undefined;

              return (
                <Pressable
                  key={`cell-${String(blockIndex)}`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    onPickBlock != null
                      ? `Pick ${timeLabel}, ${String(overlap)} available`
                      : `${selected ? 'Available' : 'Unavailable'} ${timeLabel}`
                  }
                  accessibilityState={{ selected }}
                  disabled={readOnly && onPickBlock == null}
                  style={{
                    width: 52,
                    minHeight: ROW_MIN_HEIGHT,
                    backgroundColor: bg ?? '#e5e7eb',
                  }}
                  className="m-0.5 rounded border border-neutral-200 active:opacity-80 dark:border-neutral-700 dark:bg-neutral-800"
                  onPress={() => {
                    handleCell(blockIndex);
                  }}
                >
                  {overlapCounts != null && overlap > 0 ? (
                    <Text className="text-center text-[10px] font-semibold text-white">{overlap}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
