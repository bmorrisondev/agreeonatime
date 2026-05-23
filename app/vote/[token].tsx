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
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvailabilityGrid } from '@/components/availability/availability-grid';
import { VoteBar } from '@/components/events/vote-bar';
import type { GridSpec, RangeWindow } from '@/lib/availability/grid';
import { WebVoteAppLink } from '@/components/linking/web-vote-app-link';
import { useWebOpenVoteInApp } from '@/hooks/use-web-open-vote-in-app';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatVoteYesNoLabel, formatVotesForTimeLabel } from '@/lib/accessibility/vote-controls';
import { APP_STORE_APP_ID } from '@/lib/constants/native-app-linking';
import { isConvexConfigured } from '@/lib/convex/client';
import { formatMutationError } from '@/lib/convex/format-mutation-error';
import { isEventAtCapacityError } from '@/lib/convex/subscription-errors';
import { t } from '@/lib/i18n/t';
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
import { EVENT_TIME_MINUTE_INTERVAL, roundDate } from '@/lib/events/time-rounding';

const APP_STORE_URL = `https://apps.apple.com/app/agree-on-a-time/id${APP_STORE_APP_ID}`;

const guestGetQuery = makeFunctionReference<'query'>('guestEvents:getByShareToken');
const guestSetVoteMutation = makeFunctionReference<'mutation'>('guestEvents:setGuestVote');
const guestProposeMutation = makeFunctionReference<'mutation'>('guestEvents:proposeGuestTimeslot');
const guestSubmitAvailabilityMutation = makeFunctionReference<'mutation'>(
  'guestEvents:submitGuestAvailability',
);

type GuestEvent = {
  _id: string;
  title: string;
  description?: string;
  status: 'open' | 'closed' | 'decided';
  deadline: number;
  allowInviteeProposals: boolean;
  schedulingMode?: 'discrete' | 'range';
  gridSpec?: GridSpec;
  rangeWindows?: RangeWindow[];
  myAvailableBlocks?: number[];
  decidedTimeslotId?: string;
  decidedStartTime?: number;
  ownerName: string;
  ownerHasActiveSub: boolean;
  isViewerOwner?: boolean;
  approvedTimeslots: { _id: string; startTime: number; yesCount: number; noCount: number }[];
  pendingCount: number;
};

const DEFAULT_PROPOSE_OFFSET_MS = 60 * 60 * 1000;

export default function VoteByTokenScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const webScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const { isAuthenticated } = useConvexAuth();
  const raw = useLocalSearchParams<{ token: string }>().token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const configured = isConvexConfigured();
  const sessionId = useMemo(() => getOrCreateGuestSessionId(), []);
  const [name, setName] = useState(() => getStoredGuestName());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeAt, setProposeAt] = useState(() =>
    roundDate(new Date(Date.now() + DEFAULT_PROPOSE_OFFSET_MS)),
  );
  const [voted, setVoted] = useState(false);
  const [myVotes, setMyVotes] = useState<Record<string, 'yes' | 'no'>>({});
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(() => new Set());
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
    configured && token != null && token.length >= 8
      ? { shareToken: token, voterSessionId: sessionId }
      : 'skip',
  ) as GuestEvent | null | undefined;

  useEffect(() => {
    if (event?.myAvailableBlocks != null) {
      setSelectedBlocks(new Set(event.myAvailableBlocks));
      if (event.myAvailableBlocks.length > 0) {
        setVoted(true);
      }
    }
  }, [event?.myAvailableBlocks]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isAuthenticated || event == null || typeof event !== 'object') {
      return;
    }
    const eventId = event._id;
    if (typeof eventId === 'string' && eventId.length > 0) {
      router.replace(`/event/${eventId}`);
    }
  }, [event, isAuthenticated]);

  const shouldOpenInApp =
    configured &&
    token != null &&
    token.length >= 8 &&
    event != null &&
    typeof event === 'object' &&
    event.status === 'open';

  useWebOpenVoteInApp(token, shouldOpenInApp);

  const deadlineLine = useMemo(() => {
    if (event == null || typeof event !== 'object' || !('deadline' in event)) {
      return '';
    }
    return t('vote_guest_closes_line', {
      deadline: formatDeadlineLine(event.deadline, nowMs),
    });
  }, [event, nowMs]);

  const setVote = useMutation(guestSetVoteMutation);
  const propose = useMutation(guestProposeMutation);
  const submitAvailability = useMutation(guestSubmitAvailabilityMutation);

  const onToggleBlock = useCallback((blockIndex: number) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockIndex)) {
        next.delete(blockIndex);
      } else {
        next.add(blockIndex);
      }
      return next;
    });
  }, []);

  const onSubmitAvailability = useCallback(async () => {
    if (!configured || token == null || token.length < 8) {
      return;
    }
    const n = name.trim();
    if (n.length === 0) {
      setError(t('invitee_name_required'));
      return;
    }
    setStoredGuestName(n);
    setBusy('availability');
    setError(null);
    try {
      await submitAvailability({
        shareToken: token,
        voterSessionId: sessionId,
        voterName: n,
        availableBlockIndices: [...selectedBlocks],
      });
      setVoted(true);
    } catch (e: unknown) {
      if (isEventAtCapacityError(e)) {
        setError(t('vote_event_at_capacity'));
      } else {
        setError(formatMutationError(e, 'Could not save availability'));
      }
    } finally {
      setBusy(null);
    }
  }, [configured, name, selectedBlocks, sessionId, submitAvailability, token]);

  const onVote = useCallback(
    async (timeslotId: string, vote: 'yes' | 'no') => {
      if (!configured || token == null || token.length < 8) {
        return;
      }
      const n = name.trim();
      if (n.length === 0) {
        setError(t('invitee_name_required'));
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
          vote,
          timeslotId,
        });
        setMyVotes((prev) => ({ ...prev, [timeslotId]: vote }));
        setVoted(true);
      } catch (e: unknown) {
        if (isEventAtCapacityError(e)) {
          setError(t('vote_event_at_capacity'));
        } else {
          setError(formatMutationError(e, t('invitee_vote_error')));
        }
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
      setError(t('vote_guest_name_required_first'));
      return;
    }
    setStoredGuestName(n);
    setBusy('propose');
    setError(null);
    try {
      const startMs = proposeAt.getTime();
      if (!Number.isFinite(startMs)) {
        setError(t('invitee_propose_invalid_time'));
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
      setError(formatMutationError(e, t('invitee_propose_error')));
    } finally {
      setBusy(null);
    }
  }, [configured, name, propose, proposeAt, sessionId, token]);

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text
          allowFontScaling
          className="text-center text-base text-neutral-700 dark:text-neutral-300"
          maxFontSizeMultiplier={2}
        >
          {t('vote_guest_convex_not_configured')}
        </Text>
      </View>
    );
  }

  if (token == null || token.length < 8) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text
          allowFontScaling
          className="text-center text-base text-neutral-700 dark:text-neutral-300"
          maxFontSizeMultiplier={2}
        >
          {t('vote_guest_invalid_link')}
        </Text>
      </View>
    );
  }

  if (event === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white dark:bg-black"
        accessibilityLabel={t('vote_guest_loading_a11y')}
      >
        <ActivityIndicator size="large" accessibilityLabel={t('a11y_loading')} />
      </View>
    );
  }

  if (event === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text
          allowFontScaling
          className="text-center text-base text-neutral-700 dark:text-neutral-300"
          maxFontSizeMultiplier={2}
        >
          {t('vote_guest_not_found')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('vote_guest_go_home_a11y')}
          className="mt-8 min-h-[44px] items-center justify-center rounded-lg bg-[#FF6B5C] px-5 active:opacity-90"
          onPress={() => {
            router.replace('/');
          }}
        >
          <Text allowFontScaling className="text-sm font-semibold text-white" maxFontSizeMultiplier={2}>
            {t('vote_guest_go_home')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (event.status === 'decided' && event.decidedStartTime != null) {
    const decidedTime = formatTimeslotWithTimezone(event.decidedStartTime);
    return (
      <ScrollView
        className="flex-1 bg-white dark:bg-black"
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
      >
        <Text
          allowFontScaling
          className="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
          maxFontSizeMultiplier={2}
        >
          {event.title}
        </Text>
        <Text allowFontScaling className="mt-4 text-base text-neutral-700 dark:text-neutral-300" maxFontSizeMultiplier={2}>
          {t('vote_guest_decided_line', { host: event.ownerName, time: decidedTime })}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('vote_guest_get_app_a11y')}
          className="mt-8 min-h-[44px] items-center justify-center rounded-xl bg-[#FF6B5C] active:opacity-90"
          onPress={() => void Linking.openURL(APP_STORE_URL)}
        >
          <Text allowFontScaling className="text-base font-semibold text-white" maxFontSizeMultiplier={2}>
            {t('vote_guest_get_app')}
          </Text>
        </Pressable>
        <Text
          allowFontScaling
          className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-500"
          maxFontSizeMultiplier={2}
        >
          {t('vote_guest_host_footer')}
        </Text>
      </ScrollView>
    );
  }

  if (event.status !== 'open') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text
          allowFontScaling
          className="text-center text-base text-neutral-700 dark:text-neutral-300"
          maxFontSizeMultiplier={2}
        >
          {t('vote_guest_voting_closed')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
    >
      {token != null && token.length >= 8 ? <WebVoteAppLink shareToken={token} /> : null}
      <Text allowFontScaling className="text-2xl font-bold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
        {event.title}
      </Text>
      {event.description != null && event.description.length > 0 ? (
        <Text allowFontScaling className="mt-2 text-base text-neutral-600 dark:text-neutral-400" maxFontSizeMultiplier={2}>
          {event.description}
        </Text>
      ) : null}
      <Text allowFontScaling className="mt-2 text-sm text-neutral-500 dark:text-neutral-500" maxFontSizeMultiplier={2}>
        {deadlineLine}
      </Text>

      <Text allowFontScaling className="mt-6 text-sm font-semibold text-neutral-800 dark:text-neutral-200" maxFontSizeMultiplier={2}>
        {t('vote_guest_your_name')}
      </Text>
      <TextInput
        accessibilityLabel={t('vote_guest_your_name_a11y')}
        className="mt-2 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
        placeholder={t('vote_guest_name_placeholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {error != null ? (
        <Text className="mt-3 text-sm text-red-600 dark:text-red-400" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {event.schedulingMode === 'range' && event.gridSpec != null && event.rangeWindows != null ? (
        <View className="mt-6">
          <Text allowFontScaling className="text-sm font-semibold text-neutral-800 dark:text-neutral-200" maxFontSizeMultiplier={2}>
            Tap blocks when you are free (30 min each)
          </Text>
          <AvailabilityGrid
            gridSpec={event.gridSpec}
            rangeWindows={event.rangeWindows}
            selectedBlocks={selectedBlocks}
            onToggleBlock={onToggleBlock}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit availability"
            disabled={busy === 'availability'}
            className="mt-4 min-h-[44px] items-center justify-center rounded-xl bg-[#FF6B5C] active:opacity-90 disabled:opacity-50"
            onPress={() => void onSubmitAvailability()}
          >
            {busy === 'availability' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text allowFontScaling className="text-base font-semibold text-white" maxFontSizeMultiplier={2}>
                Submit availability
              </Text>
            )}
          </Pressable>
        </View>
      ) : (
        <>
      <Text allowFontScaling className="mt-8 text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400" maxFontSizeMultiplier={2}>
        {t('vote_guest_times')}
      </Text>
      {event.approvedTimeslots.map((slot) => {
        const loading = busy != null && busy.startsWith(`${slot._id}:`);
        const timeLabel = formatTimeslotWithTimezone(slot.startTime);
        const barLabel = formatVotesForTimeLabel(timeLabel);
        const myVote = myVotes[slot._id];
        return (
          <View key={slot._id} className="mt-4 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
            <Text allowFontScaling className="text-base font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
              {timeLabel}
            </Text>
            <View className="mt-2">
              <VoteBar
                yesCount={slot.yesCount}
                noCount={slot.noCount}
                accessibilityLabel={barLabel}
              />
            </View>
            {myVote != null ? (
              <Text allowFontScaling className="mt-2 text-sm text-neutral-600 dark:text-neutral-400" maxFontSizeMultiplier={2}>
                {t('vote_guest_your_vote', {
                  vote: myVote === 'yes' ? t('invitee_vote_yes') : t('invitee_vote_no'),
                })}
              </Text>
            ) : null}
            <View className="mt-3 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={formatVoteYesNoLabel(timeLabel, 'yes', myVote === 'yes')}
                accessibilityState={{ selected: myVote === 'yes' }}
                disabled={loading}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-lg active:opacity-90 disabled:opacity-50 ${
                  myVote === 'yes' ? 'bg-emerald-700' : 'bg-emerald-600'
                }`}
                onPress={() => void onVote(slot._id, 'yes')}
              >
                {loading && busy === `${slot._id}:yes` ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text allowFontScaling className="text-sm font-semibold text-white" maxFontSizeMultiplier={2}>
                    {myVote === 'yes' ? '✓ ' : ''}
                    {t('invitee_vote_yes')}
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={formatVoteYesNoLabel(timeLabel, 'no', myVote === 'no')}
                accessibilityState={{ selected: myVote === 'no' }}
                disabled={loading}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-lg border active:bg-neutral-50 disabled:opacity-50 dark:active:bg-neutral-800 ${
                  myVote === 'no'
                    ? 'border-neutral-500 bg-neutral-100 dark:border-neutral-400 dark:bg-neutral-800'
                    : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900'
                }`}
                onPress={() => void onVote(slot._id, 'no')}
              >
                {loading && busy === `${slot._id}:no` ? (
                  <ActivityIndicator color="#666" />
                ) : (
                  <Text allowFontScaling className="text-sm font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
                    {myVote === 'no' ? '✗ ' : ''}
                    {t('invitee_vote_no')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        );
      })}

      {event.schedulingMode !== 'range' && event.allowInviteeProposals ? (
        <View className="mt-8">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              proposeOpen ? t('invitee_hide_propose_a11y') : t('invitee_show_propose_a11y')
            }
            className="min-h-[44px] justify-center rounded-lg border border-dashed border-neutral-400 dark:border-neutral-600"
            onPress={() => {
              setProposeOpen((open) => {
                if (!open) {
                  setProposeAt(roundDate(new Date(Date.now() + DEFAULT_PROPOSE_OFFSET_MS)));
                }
                return !open;
              });
            }}
          >
            <Text allowFontScaling className="text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200" maxFontSizeMultiplier={2}>
              {proposeOpen ? t('invitee_hide_propose') : t('invitee_show_propose')}
            </Text>
          </Pressable>
          {proposeOpen ? (
            <View className="mt-4">
              {Platform.OS === 'web' ? (
                <WebDatetimeLocalInput
                  accessibilityLabel={t('invitee_propose_datetime_a11y')}
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
                  minuteInterval={EVENT_TIME_MINUTE_INTERVAL}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (date) {
                      setProposeAt(roundDate(date));
                    }
                  }}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('invitee_submit_proposal_a11y')}
                disabled={busy === 'propose'}
                className="mt-4 min-h-[44px] items-center justify-center rounded-lg bg-[#FF6B5C] active:opacity-90 disabled:opacity-50"
                onPress={() => void onPropose()}
              >
                {busy === 'propose' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text allowFontScaling className="text-sm font-semibold text-white" maxFontSizeMultiplier={2}>
                    {t('invitee_submit_proposal')}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

        </>
      )}

      {voted ? (
        <View className="mt-8 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30" accessibilityLiveRegion="polite">
          <Text allowFontScaling className="text-center text-base font-semibold text-emerald-800 dark:text-emerald-200" maxFontSizeMultiplier={2}>
            {event.schedulingMode === 'range'
              ? `Thanks — ${event.ownerName} will see when you are free.`
              : t('invitee_vote_ack', { host: event.ownerName })}
          </Text>
        </View>
      ) : event.schedulingMode !== 'range' ? (
        <Text allowFontScaling className="mt-10 text-center text-xs text-neutral-500 dark:text-neutral-500" maxFontSizeMultiplier={2}>
          {t('invitee_vote_footer', { host: event.ownerName })}
        </Text>
      ) : null}
    </ScrollView>
  );
}
