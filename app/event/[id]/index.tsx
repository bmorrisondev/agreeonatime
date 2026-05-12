import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { makeFunctionReference } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DsToast } from '@/components/design-system';
import { VoteBar } from '@/components/events/vote-bar';
import { buildVoteUrl } from '@/lib/events/build-share-url';
import {
  formatDeadlineLine,
  formatDecidedTime,
  formatTimeslotWithTimezone,
} from '@/lib/events/format-event-home';
import { isConvexConfigured } from '@/lib/convex/client';

const getForOwnerQuery = makeFunctionReference<'query'>('events:getForOwner');
const resolvePendingTimeslotMutation = makeFunctionReference<'mutation'>(
  'events:resolvePendingTimeslot',
);

interface ApprovedSlot {
  _id: string;
  startTime: number;
  yesCount: number;
  noCount: number;
  votes: { voterName: string; vote: 'yes' | 'no'; voterKey: string }[];
}

interface PendingSlot {
  _id: string;
  startTime: number;
  createdAt: number;
}

export default function EventDetailScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const configured = isConvexConfigured();
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  useEffect(() => {
    const t = setInterval(() => {
      setTick((n) => n + 1);
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const event = useQuery(
    getForOwnerQuery,
    configured && id != null && id.length > 0 ? { eventId: id } : 'skip',
  );

  const resolvePending = useMutation(resolvePendingTimeslotMutation);

  const nowMs = Date.now() + tick * 0;

  const toggleExpanded = useCallback((slotId: string) => {
    setExpanded((prev) => ({ ...prev, [slotId]: !prev[slotId] }));
  }, []);

  const dismissShareToast = useCallback(() => {
    setShareToast((s) => ({ ...s, visible: false }));
  }, []);

  const onShare = useCallback(async (title: string, shareToken: string) => {
    const url = buildVoteUrl(shareToken);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(url);
        setShareToast({ visible: true, message: 'Voting link copied to clipboard' });
      } catch {
        Alert.alert('Could not copy link', 'Check browser permissions and try again.');
      }
      return;
    }
    const message = `Vote on “${title}”:\n${url}`;
    try {
      await Share.share({ message, url }, { subject: title });
    } catch {
      Alert.alert('Could not open share sheet');
    }
  }, []);

  const onResolveProposal = useCallback(
    async (eventId: string, timeslotId: string, decision: 'approve' | 'reject') => {
      setBusySlotId(timeslotId);
      try {
        await resolvePending({ eventId, timeslotId, decision });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Something went wrong';
        Alert.alert('Could not update proposal', msg);
      } finally {
        setBusySlotId(null);
      }
    },
    [resolvePending],
  );

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

  const approvedSlots = event.approvedTimeslots as ApprovedSlot[];
  const pendingSlots = event.pendingTimeslots as PendingSlot[];
  const deadlinePassed = nowMs >= event.deadline;
  const everySlotHasVotes =
    approvedSlots.length > 0 && approvedSlots.every((s) => s.yesCount + s.noCount > 0);
  const pickTimePrimary = deadlinePassed || everySlotHasVotes;

  return (
    <View className="relative flex-1 bg-white dark:bg-black">
      <ScrollView
        className="flex-1 bg-white dark:bg-black"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
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
        {event.description != null && event.description.length > 0 ? (
          <Text className="mt-2 text-base text-neutral-700 dark:text-neutral-300">
            {event.description}
          </Text>
        ) : null}

        <Text
          className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400"
          accessibilityLabel={`Voting deadline ${formatDeadlineLine(event.deadline, nowMs)}`}
        >
          {event.status === 'open'
            ? `Closes ${formatDeadlineLine(event.deadline, nowMs)}`
            : 'Voting closed'}
        </Text>

        {event.status === 'decided' && event.decidedStartTime != null ? (
          <Text className="mt-2 text-base text-neutral-800 dark:text-neutral-200">
            {formatDecidedTime(event.decidedStartTime)}
          </Text>
        ) : null}

        <View className="mt-4 flex-row flex-wrap gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share voting link"
            className="rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2.5 active:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-900 dark:active:bg-neutral-800"
            onPress={() => void onShare(event.title, event.shareToken)}
          >
            <Text className="text-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Share
            </Text>
          </Pressable>
        </View>

        {pendingSlots.length > 0 ? (
          <View className="mt-8" accessibilityRole="summary">
            <Text className="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              Pending proposals
            </Text>
            {pendingSlots.map((p) => (
              <View
                key={p._id}
                className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40"
              >
                <Text className="text-base text-neutral-900 dark:text-neutral-100">
                  {formatTimeslotWithTimezone(p.startTime)}
                </Text>
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Approve proposed time ${formatTimeslotWithTimezone(p.startTime)}`}
                    disabled={busySlotId === p._id}
                    className="flex-1 items-center rounded-lg bg-emerald-600 py-2.5 active:opacity-90 disabled:opacity-50 dark:bg-emerald-500"
                    onPress={() => void onResolveProposal(event._id, p._id, 'approve')}
                  >
                    {busySlotId === p._id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-sm font-semibold text-white">Approve</Text>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reject proposed time ${formatTimeslotWithTimezone(p.startTime)}`}
                    disabled={busySlotId === p._id}
                    className="flex-1 items-center rounded-lg border border-neutral-300 bg-white py-2.5 active:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:active:bg-neutral-800"
                    onPress={() => void onResolveProposal(event._id, p._id, 'reject')}
                  >
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Reject
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View className="mt-8">
          <Text className="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">
            Proposed times
          </Text>
          {approvedSlots.length === 0 ? (
            <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              No approved times yet.
            </Text>
          ) : (
            approvedSlots.map((slot) => {
              const isDecided = event.decidedTimeslotId === slot._id;
              const open = expanded[slot._id] === true;
              const barLabel = `Votes for ${formatTimeslotWithTimezone(slot.startTime)}: ${slot.yesCount} yes, ${slot.noCount} no`;
              return (
                <View
                  key={slot._id}
                  className={`mt-3 rounded-xl border p-3 ${
                    isDecided
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                      : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50'
                  }`}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${formatTimeslotWithTimezone(slot.startTime)}. ${slot.yesCount} yes, ${slot.noCount} no. ${open ? 'Collapse' : 'Expand'} voter list`}
                    onPress={() => toggleExpanded(slot._id)}
                  >
                    <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatTimeslotWithTimezone(slot.startTime)}
                      {isDecided ? ' · Decided' : ''}
                    </Text>
                    <View className="mt-2">
                      <VoteBar
                        yesCount={slot.yesCount}
                        noCount={slot.noCount}
                        accessibilityLabel={barLabel}
                      />
                    </View>
                  </Pressable>
                  {open ? (
                    <View
                      className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700"
                      accessibilityRole="list"
                    >
                      {slot.votes.length === 0 ? (
                        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                          No voters yet.
                        </Text>
                      ) : (
                        slot.votes.map((v, i) => (
                          <Text
                            key={`${v.voterKey}-${i}`}
                            className="mt-1 text-sm text-neutral-800 dark:text-neutral-200"
                            accessibilityLabel={`${v.voterName}, ${v.vote === 'yes' ? 'yes' : 'no'}`}
                          >
                            {v.voterName} — {v.vote === 'yes' ? 'Yes' : 'No'}
                          </Text>
                        ))
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pick the time for this event"
          className={`mt-10 items-center rounded-xl py-3.5 ${
            pickTimePrimary
              ? 'bg-[#FF6B5C] active:opacity-90'
              : 'border border-neutral-300 bg-white active:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:active:bg-neutral-800'
          }`}
          onPress={() => {
            router.push(`/event/${id}/pick-time`);
          }}
        >
          <Text
            className={`text-base font-semibold ${pickTimePrimary ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}`}
          >
            Pick the time
          </Text>
        </Pressable>
      </ScrollView>
      <DsToast
        message={shareToast.message}
        visible={shareToast.visible}
        onDismiss={dismissShareToast}
      />
    </View>
  );
}
