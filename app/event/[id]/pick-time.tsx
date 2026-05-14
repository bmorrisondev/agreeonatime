import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { makeFunctionReference } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DsButton, DsModal } from '@/components/design-system';
import { VoteBar } from '@/components/events/vote-bar';
import { formatTimeslotWithTimezone } from '@/lib/events/format-event-home';
import { isConvexConfigured } from '@/lib/convex/client';
import { t } from '@/lib/i18n/t';

const getForOwnerQuery = makeFunctionReference<'query'>('events:getForOwner');
const finalizeEventTimeMutation = makeFunctionReference<'mutation'>(
  'events:finalizeEventTime',
);

interface ApprovedSlot {
  _id: string;
  startTime: number;
  yesCount: number;
  noCount: number;
  votes: { voterName: string; vote: 'yes' | 'no'; voterKey: string }[];
}

/**
 * Compute the suggested winner: slot with the most yes votes.
 * Ties broken by earliest startTime.
 */
function computeSuggestedSlot(slots: ApprovedSlot[]): ApprovedSlot | null {
  if (slots.length === 0) return null;
  let best = slots[0];
  for (let i = 1; i < slots.length; i++) {
    const s = slots[i];
    if (
      s.yesCount > best.yesCount ||
      (s.yesCount === best.yesCount && s.startTime < best.startTime)
    ) {
      best = s;
    }
  }
  return best;
}

export default function PickTimeScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const configured = isConvexConfigured();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const event = useQuery(
    getForOwnerQuery,
    configured && id != null && id.length > 0 ? { eventId: id } : 'skip',
  );

  const finalize = useMutation(finalizeEventTimeMutation);

  const approvedSlots = useMemo<ApprovedSlot[]>(
    () => (event?.approvedTimeslots as ApprovedSlot[] | undefined) ?? [],
    [event?.approvedTimeslots],
  );

  const suggested = useMemo(
    () => computeSuggestedSlot(approvedSlots),
    [approvedSlots],
  );

  const isRepick = event?.status === 'decided' && event.decidedTimeslotId != null;
  const currentPickId = isRepick ? (event.decidedTimeslotId as string) : null;

  const effectiveSelectedId = selectedId ?? suggested?._id ?? null;

  const selectedSlot = useMemo(
    () => approvedSlots.find((s) => s._id === effectiveSelectedId) ?? null,
    [approvedSlots, effectiveSelectedId],
  );

  const onPressSlot = useCallback((slotId: string) => {
    setSelectedId(slotId);
  }, []);

  const onPickPress = useCallback(() => {
    setConfirmVisible(true);
  }, []);

  const navigateBack = useCallback(() => {
    if (id != null && id.length > 0) {
      router.replace(`/event/${id}`);
    } else {
      router.back();
    }
  }, [id]);

  const onConfirm = useCallback(async () => {
    if (id == null || effectiveSelectedId == null) return;
    setSubmitting(true);
    try {
      await finalize({ eventId: id as any, timeslotId: effectiveSelectedId as any });
      setConfirmVisible(false);
      navigateBack();
    } catch (e: unknown) {
      setConfirmVisible(false);
      const msg = e instanceof Error ? e.message : t('pick_error_generic');
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [id, effectiveSelectedId, finalize, navigateBack]);

  const onCancelConfirm = useCallback(() => {
    setConfirmVisible(false);
  }, []);

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          Set EXPO_PUBLIC_CONVEX_URL in your environment to load events from Convex.
        </Text>
      </View>
    );
  }

  if (event === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" accessibilityLabel="Loading event" />
      </View>
    );
  }

  if (event === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-600 dark:text-neutral-400">
          Event not found or you do not have access.
        </Text>
      </View>
    );
  }

  if (approvedSlots.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-600 dark:text-neutral-400">
          {t('pick_no_slots')}
        </Text>
        <View className="mt-6">
          <DsButton variant="secondary" onPress={navigateBack}>
            Back to event
          </DsButton>
        </View>
      </View>
    );
  }

  return (
    <View className="relative flex-1 bg-white dark:bg-black">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 16,
          paddingTop: 12,
        }}
      >
        <Text
          className="text-2xl font-bold text-neutral-900 dark:text-neutral-100"
          accessibilityRole="header"
        >
          {event.title}
        </Text>

        {isRepick && (
          <View className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
            <Text className="text-sm text-amber-800 dark:text-amber-200">
              {t('pick_change_warning')}
            </Text>
          </View>
        )}

        {suggested != null && (
          <View className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <Text className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
              {t('pick_suggested')}
            </Text>
            <Text className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {formatTimeslotWithTimezone(suggested.startTime)}
            </Text>
            <View className="mt-2">
              <VoteBar
                yesCount={suggested.yesCount}
                noCount={suggested.noCount}
                accessibilityLabel={`Suggested: ${suggested.yesCount} yes, ${suggested.noCount} no`}
              />
            </View>
            <Text className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              {t('pick_suggested_hint')}
            </Text>
          </View>
        )}

        <Text className="mt-6 text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">
          All options
        </Text>

        {approvedSlots.map((slot) => {
          const isSelected = slot._id === effectiveSelectedId;
          const isSuggested = slot._id === suggested?._id;
          const isCurrentPick = slot._id === currentPickId;
          return (
            <Pressable
              key={slot._id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${formatTimeslotWithTimezone(slot.startTime)}, ${slot.yesCount} yes, ${slot.noCount} no${isSuggested ? ', suggested' : ''}${isCurrentPick ? ', current pick' : ''}${isSelected ? ', selected' : ''}`}
              className={`mt-3 rounded-xl border p-3 ${
                isSelected
                  ? 'border-[#FF6B5C] bg-[#FF6B5C]/5 dark:border-[#FF6B5C] dark:bg-[#FF6B5C]/10'
                  : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50'
              }`}
              onPress={() => onPressSlot(slot._id)}
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatTimeslotWithTimezone(slot.startTime)}
                </Text>
                <View className="ml-2 flex-row gap-1.5">
                  {isCurrentPick && (
                    <View className="rounded-full bg-blue-100 px-2 py-0.5 dark:bg-blue-900/50">
                      <Text className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        {t('pick_current')}
                      </Text>
                    </View>
                  )}
                  {isSuggested && (
                    <View className="rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900/50">
                      <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {t('pick_suggested')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View className="mt-2">
                <VoteBar
                  yesCount={slot.yesCount}
                  noCount={slot.noCount}
                  accessibilityLabel={`${slot.yesCount} yes, ${slot.noCount} no`}
                />
              </View>
              <Text className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                {slot.yesCount} yes · {slot.noCount} no
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-black"
        style={{ paddingBottom: insets.bottom + 8, paddingTop: 12 }}
      >
        <DsButton
          accessibilityLabel={isRepick ? t('pick_cta_change') : t('pick_title')}
          disabled={effectiveSelectedId == null}
          onPress={onPickPress}
        >
          {isRepick ? t('pick_cta_change') : t('pick_title')}
        </DsButton>
      </View>

      <DsModal
        visible={confirmVisible}
        title={t('pick_confirm_title')}
        onClose={onCancelConfirm}
      >
        <Text className="text-base text-neutral-700 dark:text-neutral-300">
          {selectedSlot != null
            ? isRepick
              ? t('pick_change_confirm_body', {
                  slot: formatTimeslotWithTimezone(selectedSlot.startTime),
                })
              : t('pick_confirm_body', {
                  slot: formatTimeslotWithTimezone(selectedSlot.startTime),
                })
            : ''}
        </Text>
        <View className="mt-6 flex-row gap-3">
          <View className="flex-1">
            <DsButton variant="secondary" onPress={onCancelConfirm}>
              {t('ds_common_cancel')}
            </DsButton>
          </View>
          <View className="flex-1">
            <DsButton disabled={submitting} onPress={() => void onConfirm()}>
              {submitting ? 'Confirming…' : t('pick_confirm_action')}
            </DsButton>
          </View>
        </View>
      </DsModal>
    </View>
  );
}
