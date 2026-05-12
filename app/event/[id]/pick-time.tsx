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
import { makeFunctionReference } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VoteBar } from '@/components/events/vote-bar';
import { isConvexConfigured } from '@/lib/convex/client';
import { formatTimeslotWithTimezone } from '@/lib/events/format-event-home';

const getForOwnerQuery = makeFunctionReference<'query'>('events:getForOwner');
const finalizeMutation = makeFunctionReference<'mutation'>('events:finalizeEventTime');

type Slot = {
  _id: string;
  startTime: number;
  yesCount: number;
  noCount: number;
};

export default function PickTimeScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const configured = isConvexConfigured();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const event = useQuery(
    getForOwnerQuery,
    configured && id != null && id.length > 0 ? { eventId: id } : 'skip',
  );

  const finalize = useMutation(finalizeMutation);

  const approvedSlots: Slot[] = useMemo(() => {
    if (event == null || event.approvedTimeslots == null) {
      return [];
    }
    return event.approvedTimeslots as Slot[];
  }, [event]);

  const suggested = useMemo((): Slot | null => {
    if (approvedSlots.length === 0) {
      return null;
    }
    const sorted = [...approvedSlots].sort((a, b) => {
      if (b.yesCount !== a.yesCount) {
        return b.yesCount - a.yesCount;
      }
      return a.startTime - b.startTime;
    });
    return sorted[0] ?? null;
  }, [approvedSlots]);

  const effectiveSelection = selectedId ?? suggested?._id ?? null;

  const onConfirm = useCallback(async () => {
    if (!configured || id == null || effectiveSelection == null || event == null) {
      return;
    }
    setSubmitting(true);
    try {
      await finalize({ eventId: id, timeslotId: effectiveSelection });
      Alert.alert('Time locked in', 'Share with the group?', [
        {
          text: 'Back to event',
          onPress: () => {
            router.replace(`/event/${id}`);
          },
        },
        { text: 'OK', onPress: () => router.replace(`/event/${id}`) },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not finalize';
      Alert.alert('Something went wrong', msg);
    } finally {
      setSubmitting(false);
    }
  }, [configured, effectiveSelection, event, finalize, id]);

  if (!configured || id == null || id.length === 0) {
    return (
      <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
        <Text className="text-base text-neutral-700 dark:text-neutral-300">Missing event.</Text>
      </View>
    );
  }

  if (event === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white dark:bg-black"
        accessibilityLabel="Loading event"
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (event === null) {
    return (
      <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
        <Text className="text-base text-neutral-700 dark:text-neutral-300">
          Sign in as the host to pick a time.
        </Text>
      </View>
    );
  }

  if (event.status !== 'open') {
    return (
      <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
        <Text className="text-base text-neutral-700 dark:text-neutral-300">
          This event is already finalized.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to event"
          className="mt-6 self-start rounded-lg bg-neutral-200 px-4 py-2.5 dark:bg-neutral-800"
          onPress={() => router.replace(`/event/${id}`)}
        >
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
    >
      <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Pick the time</Text>
      <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Suggested winner has the most yes votes (ties go to the earliest time). Tap another slot to override, then
        confirm.
      </Text>

      {suggested != null ? (
        <View className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <Text className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-200">Suggested</Text>
          <Text className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {formatTimeslotWithTimezone(suggested.startTime)}
          </Text>
          <View className="mt-2">
            <VoteBar
              yesCount={suggested.yesCount}
              noCount={suggested.noCount}
              accessibilityLabel={`Suggested slot votes ${suggested.yesCount} yes ${suggested.noCount} no`}
            />
          </View>
        </View>
      ) : null}

      <Text className="mt-8 text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">
        All times
      </Text>
      {approvedSlots.map((slot) => {
        const selected = effectiveSelection === slot._id;
        return (
          <Pressable
            key={slot._id}
            accessibilityRole="button"
            accessibilityLabel={`Select ${formatTimeslotWithTimezone(slot.startTime)}`}
            className={`mt-3 rounded-xl border p-3 ${
              selected
                ? 'border-[#FF6B5C] bg-orange-50 dark:border-[#FF6B5C] dark:bg-orange-950/20'
                : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50'
            }`}
            onPress={() => {
              setSelectedId(slot._id);
            }}
          >
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {formatTimeslotWithTimezone(slot.startTime)}
            </Text>
            <View className="mt-2">
              <VoteBar
                yesCount={slot.yesCount}
                noCount={slot.noCount}
                accessibilityLabel={`Votes ${slot.yesCount} yes ${slot.noCount} no`}
              />
            </View>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Confirm selected time"
        disabled={submitting || effectiveSelection == null}
        className="mt-8 items-center rounded-lg bg-[#FF6B5C] py-3.5 active:opacity-90 disabled:opacity-50"
        onPress={() => void onConfirm()}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Confirm</Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel and go back"
        className="mt-4 items-center py-2"
        onPress={() => router.back()}
      >
        <Text className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}
