import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useAction } from 'convex/react';

import { DsModal } from '@/components/design-system/modal-sheet';
import { formatDateTimeMs } from '@/lib/events/format-event-home';
import { formatMutationError } from '@/lib/convex/format-mutation-error';
import { EVENT_MAX_SLOTS } from '@/lib/events/event-form';

const getSuggestedTimeslotsAction = makeFunctionReference<'action'>('aiSuggestions:getSuggestedTimeslots');

type Suggestion = {
  readonly startTimeMs: number;
  readonly rationale: string;
};

type SuggestionsResult =
  | { readonly status: 'success'; readonly suggestions: Suggestion[] }
  | { readonly status: 'insufficient_history'; readonly message: string; readonly decidedCount: number }
  | { readonly status: 'error'; readonly message: string };

export interface AiTimeSuggestionsProps {
  readonly disabled?: boolean;
  readonly deadlineMs: number;
  readonly existingSlotMs: readonly number[];
  readonly isPro: boolean;
  readonly isLoaded: boolean;
  readonly layout?: 'chip' | 'default';
  readonly onAddSlot: (startTimeMs: number) => void;
  readonly onOpenPaywall: () => void;
  readonly slotCount: number;
}

export function AiTimeSuggestions({
  disabled = false,
  deadlineMs,
  existingSlotMs,
  isPro,
  isLoaded,
  layout = 'default',
  onAddSlot,
  onOpenPaywall,
  slotCount,
}: AiTimeSuggestionsProps): ReactElement {
  const getSuggestions = useAction(getSuggestedTimeslotsAction);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestionsResult | null>(null);

  const canAddMore = slotCount < EVENT_MAX_SLOTS;

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = (await getSuggestions({
        deadlineMs,
        existingSlotMs: [...existingSlotMs],
      })) as SuggestionsResult;
      setResult(response);
    } catch (e: unknown) {
      setError(formatMutationError(e, 'Could not load AI suggestions'));
    } finally {
      setLoading(false);
    }
  }, [deadlineMs, existingSlotMs, getSuggestions]);

  const onPressChip = useCallback(() => {
    if (!isLoaded) {
      return;
    }
    if (!isPro) {
      onOpenPaywall();
      return;
    }
    setModalVisible(true);
    void fetchSuggestions();
  }, [fetchSuggestions, isLoaded, isPro, onOpenPaywall]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setError(null);
    setResult(null);
  }, []);

  const onSelectSuggestion = useCallback(
    (startTimeMs: number) => {
      if (!canAddMore) {
        return;
      }
      onAddSlot(startTimeMs);
      closeModal();
    },
    [canAddMore, closeModal, onAddSlot],
  );

  const onRetry = useCallback(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="AI suggestions, Agree plus feature"
        accessibilityState={{ disabled: disabled || !isLoaded }}
        className={`${layout === 'default' ? 'mb-4 self-start' : ''} flex-row items-center gap-2 rounded-full border px-3 py-2 ${
          disabled || !isLoaded
            ? 'border-neutral-300 opacity-50 dark:border-neutral-600'
            : 'border-[#FF6B5C]/40 bg-[#FF6B5C]/10 active:opacity-80 dark:border-[#FF6B5C]/50'
        }`}
        disabled={disabled || !isLoaded}
        onPress={onPressChip}
      >
        <Text className="text-sm font-semibold text-[#FF6B5C]">AI suggestions</Text>
        <Text className="rounded-full bg-[#FF6B5C]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF6B5C]">
          Agree+
        </Text>
      </Pressable>

      <DsModal title="AI suggestions" visible={modalVisible} onClose={closeModal}>
        {loading ? (
          <View className="items-center py-ds-lg">
            <ActivityIndicator color="#FF6B5C" size="large" />
            <Text className="mt-ds-md text-center text-body text-neutral-600 dark:text-neutral-300">
              Learning from your past events…
            </Text>
          </View>
        ) : error != null ? (
          <View className="gap-ds-md">
            <Text accessibilityLiveRegion="polite" className="text-body text-red-600 dark:text-red-400">
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try AI suggestions again"
              className="self-start rounded-ds-md bg-[#FF6B5C] px-ds-md py-ds-sm active:opacity-90"
              onPress={onRetry}
            >
              <Text className="text-body font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : result?.status === 'insufficient_history' ? (
          <View className="gap-ds-sm">
            <Text className="text-body text-neutral-800 dark:text-neutral-200">{result.message}</Text>
            <Text className="text-caption text-neutral-500 dark:text-neutral-400">
              You have {String(result.decidedCount)} decided event{result.decidedCount === 1 ? '' : 's'} so far.
            </Text>
          </View>
        ) : result?.status === 'error' ? (
          <View className="gap-ds-md">
            <Text accessibilityLiveRegion="polite" className="text-body text-red-600 dark:text-red-400">
              {result.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try AI suggestions again"
              className="self-start rounded-ds-md bg-[#FF6B5C] px-ds-md py-ds-sm active:opacity-90"
              onPress={onRetry}
            >
              <Text className="text-body font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : result?.status === 'success' ? (
          <ScrollView className="max-h-80" keyboardShouldPersistTaps="handled">
            <Text className="mb-ds-md text-caption text-neutral-500 dark:text-neutral-400">
              Tap a time to add it as a proposed slot.
              {!canAddMore ? ' Remove a slot first — maximum times reached.' : ''}
            </Text>
            {result.suggestions.map((row) => {
              const label = `${formatDateTimeMs(row.startTimeMs)}. ${row.rationale}`;
              return (
                <Pressable
                  key={String(row.startTimeMs)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add suggested time, ${label}`}
                  accessibilityState={{ disabled: !canAddMore }}
                  className={`mb-ds-sm rounded-ds-md border p-ds-md ${
                    canAddMore
                      ? 'border-neutral-200 bg-neutral-50 active:opacity-80 dark:border-neutral-700 dark:bg-neutral-800'
                      : 'border-neutral-200 opacity-50 dark:border-neutral-700'
                  }`}
                  disabled={!canAddMore}
                  onPress={() => {
                    onSelectSuggestion(row.startTimeMs);
                  }}
                >
                  <Text className="text-body font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatDateTimeMs(row.startTimeMs)}
                  </Text>
                  <Text className="mt-1 text-caption text-neutral-600 dark:text-neutral-300">{row.rationale}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text className="text-body text-neutral-600 dark:text-neutral-300">No suggestions yet.</Text>
        )}
      </DsModal>
    </>
  );
}
