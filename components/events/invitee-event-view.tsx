import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VoteBar } from '@/components/events/vote-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatVoteYesNoLabel, formatVotesForTimeLabel } from '@/lib/accessibility/vote-controls';
import { formatMutationError } from '@/lib/convex/format-mutation-error';
import { isEventAtCapacityError } from '@/lib/convex/subscription-errors';
import {
  formatDeadlineLine,
  formatTimeslotWithTimezone,
} from '@/lib/events/format-event-home';
import { WebDatetimeLocalInput } from '@/lib/events/web-datetime-local';
import { EVENT_TIME_MINUTE_INTERVAL, roundDate } from '@/lib/events/time-rounding';
import {
  getOrCreateGuestSessionId,
  getStoredGuestName,
  setStoredGuestName,
} from '@/lib/guest/voter-session';
import { t } from '@/lib/i18n/t';

const getForInviteeQuery = makeFunctionReference<'query'>('events:getForInvitee');
const castVoteMutation = makeFunctionReference<'mutation'>('events:castVote');
const proposeTimeslotMutation = makeFunctionReference<'mutation'>('events:proposeTimeslot');

const DEFAULT_PROPOSE_OFFSET_MS = 60 * 60 * 1000;

type InviteeSlot = {
  _id: string;
  startTime: number;
  yesCount: number;
  noCount: number;
  myVote?: 'yes' | 'no';
};

export interface InviteeEventViewProps {
  readonly eventId: string;
}

export function InviteeEventView({ eventId }: InviteeEventViewProps): ReactElement {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const webScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const { isAuthenticated } = useConvexAuth();
  const sessionId = useMemo(() => getOrCreateGuestSessionId(), []);
  const [name, setName] = useState(() => getStoredGuestName());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeAt, setProposeAt] = useState(() =>
    roundDate(new Date(Date.now() + DEFAULT_PROPOSE_OFFSET_MS)),
  );
  const [voted, setVoted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nameSynced = useRef(false);

  useEffect(() => {
    tickRef.current = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const event = useQuery(getForInviteeQuery, {
    eventId,
    voterSessionId: isAuthenticated ? undefined : sessionId,
  });

  useEffect(() => {
    if (
      !nameSynced.current &&
      event != null &&
      typeof event === 'object' &&
      'viewerDisplayName' in event &&
      typeof event.viewerDisplayName === 'string' &&
      event.viewerDisplayName.length > 0 &&
      name.trim().length === 0
    ) {
      setName(event.viewerDisplayName);
      nameSynced.current = true;
    }
  }, [event, name]);

  const castVote = useMutation(castVoteMutation);
  const proposeTimeslot = useMutation(proposeTimeslotMutation);

  const deadlineLine = useMemo(() => {
    if (event == null || typeof event !== 'object' || !('deadline' in event)) {
      return '';
    }
    return t('invitee_closes_line', {
      deadline: formatDeadlineLine(event.deadline as number, nowMs),
    });
  }, [event, nowMs]);

  const onVote = useCallback(
    async (timeslotId: string, vote: 'yes' | 'no') => {
      const n = name.trim();
      if (n.length === 0) {
        setError(t('invitee_name_required'));
        return;
      }
      setStoredGuestName(n);
      setBusy(`${timeslotId}:${vote}`);
      setError(null);
      try {
        await castVote({
          eventId,
          timeslotId,
          voterName: n,
          voterSessionId: isAuthenticated ? undefined : sessionId,
          vote,
        });
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
    [castVote, eventId, isAuthenticated, name, sessionId],
  );

  const onPropose = useCallback(async () => {
    const n = name.trim();
    if (n.length === 0) {
      setError(t('invitee_name_required'));
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
      await proposeTimeslot({ eventId, startTime: startMs });
      setProposeOpen(false);
    } catch (e: unknown) {
      setError(formatMutationError(e, t('invitee_propose_error')));
    } finally {
      setBusy(null);
    }
  }, [eventId, name, proposeAt, proposeTimeslot]);

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
          {t('invitee_event_not_found')}
        </Text>
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
      </ScrollView>
    );
  }

  if (event.status !== 'open') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          {t('invitee_voting_closed')}
        </Text>
      </View>
    );
  }

  const slots = event.approvedTimeslots as InviteeSlot[];

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{event.title}</Text>
      {event.description != null && event.description.length > 0 ? (
        <Text className="mt-2 text-base text-neutral-600 dark:text-neutral-400">{event.description}</Text>
      ) : null}
      <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">{deadlineLine}</Text>

      <Text className="mt-6 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        {t('invitee_your_name')}
      </Text>
      <TextInput
        accessibilityLabel={t('invitee_your_name_a11y')}
        className="mt-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
        placeholder={t('invitee_name_placeholder')}
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
        {t('invitee_times_heading')}
      </Text>
      {slots.map((slot) => {
        const loading = busy != null && busy.startsWith(`${slot._id}:`);
        const timeLabel = formatTimeslotWithTimezone(slot.startTime);
        const barLabel = formatVotesForTimeLabel(timeLabel);
        const myVote = slot.myVote;
        return (
          <View key={slot._id} className="mt-4 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
            <Text allowFontScaling className="text-base font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
              {timeLabel}
            </Text>
            <View className="mt-2">
              <VoteBar yesCount={slot.yesCount} noCount={slot.noCount} accessibilityLabel={barLabel} />
            </View>
            {myVote != null ? (
              <Text allowFontScaling className="mt-2 text-sm text-neutral-600 dark:text-neutral-400" maxFontSizeMultiplier={2}>
                {t('invitee_your_vote', {
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

      {event.allowInviteeProposals ? (
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
            <Text className="text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">
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
                  <Text className="text-sm font-semibold text-white">{t('invitee_submit_proposal')}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {voted ? (
        <View className="mt-8 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30" accessibilityLiveRegion="polite">
          <Text className="text-center text-base font-semibold text-emerald-800 dark:text-emerald-200">
            {t('invitee_vote_ack', { host: event.ownerName })}
          </Text>
        </View>
      ) : (
        <Text className="mt-10 text-center text-xs text-neutral-500 dark:text-neutral-500">
          {t('invitee_vote_footer', { host: event.ownerName })}
        </Text>
      )}
    </ScrollView>
  );
}
