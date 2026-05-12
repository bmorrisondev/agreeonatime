import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { makeFunctionReference } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VoteBar } from '@/components/events/vote-bar';
import { isConvexConfigured } from '@/lib/convex/client';
import { formatTimeslotWithTimezone } from '@/lib/events/format-event-home';
import {
  getOrCreateGuestSessionId,
  getStoredGuestName,
  setStoredGuestName,
} from '@/lib/guest/voter-session';

const guestGetQuery = makeFunctionReference<'query'>('guestEvents:getByShareToken');
const guestSetVoteMutation = makeFunctionReference<'mutation'>('guestEvents:setGuestVote');
const guestProposeMutation = makeFunctionReference<'mutation'>('guestEvents:proposeGuestTimeslot');

type GuestEvent = {
  _id: string;
  title: string;
  description?: string;
  status: 'open' | 'closed' | 'decided';
  deadline: number;
  allowInviteeProposals: boolean;
  decidedTimeslotId?: string;
  decidedStartTime?: number;
  approvedTimeslots: { _id: string; startTime: number; yesCount: number; noCount: number }[];
  pendingCount: number;
};

export default function VoteByTokenScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams<{ token: string }>().token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const configured = isConvexConfigured();
  const sessionId = useMemo(() => getOrCreateGuestSessionId(), []);
  const [name, setName] = useState(() => getStoredGuestName());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeAt, setProposeAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [proposeIso, setProposeIso] = useState('');

  const event = useQuery(
    guestGetQuery,
    configured && token != null && token.length >= 8 ? { shareToken: token } : 'skip',
  ) as GuestEvent | null | undefined;

  const deadlineLine = useMemo(() => {
    if (event == null || typeof event !== 'object' || !('deadline' in event)) {
      return '';
    }
    const d = new Date(event.deadline);
    return `Deadline ${d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
  }, [event]);

  const setVote = useMutation(guestSetVoteMutation);
  const propose = useMutation(guestProposeMutation);

  const onVote = useCallback(
    async (timeslotId: string, vote: 'yes' | 'no') => {
      if (!configured || token == null || token.length < 8) {
        return;
      }
      const n = name.trim();
      if (n.length === 0) {
        setError('Enter your name so the host knows who voted.');
        return;
      }
      setStoredGuestName(n);
      setBusy(`${timeslotId}:${vote}`);
      setError(null);
      try {
        await setVote({
          shareToken: token,
          voterSessionId: sessionId,
          voterName: n,
          timeslotId,
          vote,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not save vote';
        setError(msg);
      } finally {
        setBusy(null);
      }
    },
    [configured, name, sessionId, setVote, token],
  );

  const onPropose = useCallback(async () => {
    if (!configured || token == null || token.length < 8) {
      return;
    }
    const n = name.trim();
    if (n.length === 0) {
      setError('Enter your name first.');
      return;
    }
    setStoredGuestName(n);
    setBusy('propose');
    setError(null);
    try {
      const startMs =
        Platform.OS === 'web' ? Date.parse(proposeIso.trim()) : proposeAt.getTime();
      if (!Number.isFinite(startMs) || Number.isNaN(startMs)) {
        setError('Enter a valid date and time.');
        setBusy(null);
        return;
      }
      await propose({
        shareToken: token,
        voterSessionId: sessionId,
        voterName: n,
        startTime: startMs,
      });
      setProposeOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not submit proposal';
      setError(msg);
    } finally {
      setBusy(null);
    }
  }, [configured, name, propose, proposeAt, proposeIso, sessionId, token]);

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          Set EXPO_PUBLIC_CONVEX_URL to load this invite.
        </Text>
      </View>
    );
  }

  if (token == null || token.length < 8) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          This voting link is invalid.
        </Text>
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
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          This link does not match an event. Check with the host for an updated link.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to home"
          className="mt-8 rounded-lg bg-[#FF6B5C] px-5 py-2.5 active:opacity-90"
          onPress={() => {
            router.replace('/');
          }}
        >
          <Text className="text-sm font-semibold text-white">Go to home</Text>
        </Pressable>
      </View>
    );
  }

  if (event.status === 'decided' && event.decidedStartTime != null) {
    return (
      <ScrollView
        className="flex-1 bg-white dark:bg-black"
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
      >
        <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{event.title}</Text>
        <Text className="mt-4 text-base text-neutral-700 dark:text-neutral-300">
          The host picked a time:{' '}
          <Text className="font-semibold">{formatTimeslotWithTimezone(event.decidedStartTime)}</Text>
        </Text>
        <Text className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
          Get the Agree on a Time app from the App Store when it launches to host your own polls.
        </Text>
      </ScrollView>
    );
  }

  if (event.status !== 'open') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          Voting is closed for this event.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
    >
      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{event.title}</Text>
      {event.description != null && event.description.length > 0 ? (
        <Text className="mt-2 text-base text-neutral-600 dark:text-neutral-400">{event.description}</Text>
      ) : null}
      <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">{deadlineLine}</Text>

      <Text className="mt-6 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Your name</Text>
      <TextInput
        accessibilityLabel="Your name for voting"
        className="mt-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
        placeholder="Required"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {error != null ? (
        <Text className="mt-3 text-sm text-red-600 dark:text-red-400" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Text className="mt-8 text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">
        Times
      </Text>
      {event.approvedTimeslots.map((slot) => {
        const loading = busy != null && busy.startsWith(`${slot._id}:`);
        const barLabel = `Votes for ${formatTimeslotWithTimezone(slot.startTime)}`;
        return (
          <View key={slot._id} className="mt-4 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {formatTimeslotWithTimezone(slot.startTime)}
            </Text>
            <View className="mt-2">
              <VoteBar
                yesCount={slot.yesCount}
                noCount={slot.noCount}
                accessibilityLabel={barLabel}
              />
            </View>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Vote yes for ${formatTimeslotWithTimezone(slot.startTime)}`}
                disabled={loading}
                className="flex-1 items-center rounded-lg bg-emerald-600 py-2.5 active:opacity-90 disabled:opacity-50"
                onPress={() => void onVote(slot._id, 'yes')}
              >
                {loading && busy === `${slot._id}:yes` ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Yes</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Vote no for ${formatTimeslotWithTimezone(slot.startTime)}`}
                disabled={loading}
                className="flex-1 items-center rounded-lg border border-neutral-300 bg-white py-2.5 active:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:active:bg-neutral-800"
                onPress={() => void onVote(slot._id, 'no')}
              >
                {loading && busy === `${slot._id}:no` ? (
                  <ActivityIndicator color="#666" />
                ) : (
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">No</Text>
                )}
              </Pressable>
            </View>
          </View>
        );
      })}

      {event.allowInviteeProposals ? (
        <View className="mt-8">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={proposeOpen ? 'Hide propose time form' : 'Propose another time'}
            className="rounded-lg border border-dashed border-neutral-400 py-3 dark:border-neutral-600"
            onPress={() => {
              setProposeOpen((o) => !o);
            }}
          >
            <Text className="text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {proposeOpen ? 'Hide proposal' : 'Propose another time'}
            </Text>
          </Pressable>
          {proposeOpen ? (
            <View className="mt-4">
              {Platform.OS === 'web' ? (
                <TextInput
                  accessibilityLabel="Proposed time in ISO format"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                  placeholder="2026-06-01T15:00"
                  value={proposeIso}
                  onChangeText={setProposeIso}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <DateTimePicker
                  value={proposeAt}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (date) {
                      setProposeAt(date);
                    }
                  }}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit proposed time"
                disabled={busy === 'propose'}
                className="mt-4 items-center rounded-lg bg-[#FF6B5C] py-3 active:opacity-90 disabled:opacity-50"
                onPress={() => void onPropose()}
              >
                {busy === 'propose' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Submit proposal</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text className="mt-10 text-center text-xs text-neutral-500 dark:text-neutral-500">
        We will let you know when the host picks a time.
      </Text>
    </ScrollView>
  );
}
