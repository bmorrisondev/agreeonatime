import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isConvexConfigured } from '@/lib/convex/client';
import { formatMutationError } from '@/lib/convex/format-mutation-error';
import {
  formatDeadlineLine,
  formatTimeslotWithTimezone,
} from '@/lib/events/format-event-home';
import {
  getOrCreateGuestSessionId,
  getStoredGuestName,
  setStoredGuestName,
} from '@/lib/guest/voter-session';
import { WebDatetimeLocalInput } from '@/lib/events/web-datetime-local';

const APP_STORE_URL = 'https://apps.apple.com/app/agree-on-a-time/id6743097026';

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
  ownerName: string;
  approvedTimeslots: { _id: string; startTime: number; yesCount: number; noCount: number }[];
  pendingCount: number;
};

const DEFAULT_PROPOSE_OFFSET_MS = 60 * 60 * 1000;

export default function VoteByTokenScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const webScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const raw = useLocalSearchParams<{ token: string }>().token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const configured = isConvexConfigured();
  const sessionId = useMemo(() => getOrCreateGuestSessionId(), []);
  const [name, setName] = useState(() => getStoredGuestName());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeAt, setProposeAt] = useState(() => new Date(Date.now() + DEFAULT_PROPOSE_OFFSET_MS));
  const [voted, setVoted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const event = useQuery(
    guestGetQuery,
    configured && token != null && token.length >= 8 ? { shareToken: token } : 'skip',
  ) as GuestEvent | null | undefined;

  const deadlineLine = useMemo(() => {
    if (event == null || typeof event !== 'object' || !('deadline' in event)) {
      return '';
    }
    return `Closes ${formatDeadlineLine(event.deadline, nowMs)}`;
  }, [event, nowMs]);

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
        setVoted(true);
      } catch (e: unknown) {
        setError(formatMutationError(e, 'Could not save vote'));
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
      const startMs = proposeAt.getTime();
      if (!Number.isFinite(startMs)) {
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
      setError(formatMutationError(e, 'Could not submit proposal'));
    } finally {
      setBusy(null);
    }
  }, [configured, name, propose, proposeAt, sessionId, token]);

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
          {event.ownerName} picked a time:{' '}
          <Text className="font-semibold">{formatTimeslotWithTimezone(event.decidedStartTime)}</Text>
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Get the Agree on a Time app on the App Store"
          className="mt-8 items-center rounded-xl bg-[#FF6B5C] py-3.5 active:opacity-90"
          onPress={() => void Linking.openURL(APP_STORE_URL)}
        >
          <Text className="text-base font-semibold text-white">Get the app</Text>
        </Pressable>
        <Text className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-500">
          Host your own polls with Agree on a Time.
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
              setProposeOpen((open) => {
                if (!open) {
                  setProposeAt(new Date(Date.now() + DEFAULT_PROPOSE_OFFSET_MS));
                }
                return !open;
              });
            }}
          >
            <Text className="text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {proposeOpen ? 'Hide proposal' : 'Propose another time'}
            </Text>
          </Pressable>
          {proposeOpen ? (
            <View className="mt-4">
              {Platform.OS === 'web' ? (
                <WebDatetimeLocalInput
                  accessibilityLabel="Proposed date and time"
                  colorScheme={webScheme}
                  minMs={nowMs + 60_000}
                  valueMs={proposeAt.getTime()}
                  onChangeMs={(ms) => {
                    setProposeAt(new Date(ms));
                  }}
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

      {voted ? (
        <View className="mt-8 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30" accessibilityLiveRegion="polite">
          <Text className="text-center text-base font-semibold text-emerald-800 dark:text-emerald-200">
            Got it — we&apos;ll let you know when {event.ownerName} picks a time.
          </Text>
        </View>
      ) : (
        <Text className="mt-10 text-center text-xs text-neutral-500 dark:text-neutral-500">
          We&apos;ll let you know when {event.ownerName} picks a time.
        </Text>
      )}
    </ScrollView>
  );
}
