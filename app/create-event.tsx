import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { makeFunctionReference } from 'convex/server';
import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateTimeMs } from '@/lib/events/format-event-home';
import { RangeWindowEditor } from '@/components/availability/range-window-editor';
import {
  buildDefaultEventSlots,
  EVENT_HOUR_MS,
  EVENT_MAX_SLOTS,
  validateEventForm,
} from '@/lib/events/event-form';
import {
  buildDefaultRangeEvent,
  validateRangeEventForm,
} from '@/lib/events/range-event-form';
import type { RangeWindow } from '@/lib/availability/grid';
import { EVENT_TIME_MINUTE_INTERVAL, roundTimeMs } from '@/lib/events/time-rounding';
import { WebDatetimeLocalInput } from '@/lib/events/web-datetime-local';
import { CalendarConflictBadge } from '@/components/calendar/calendar-conflict-badge';
import { ProposedTimesHelpers } from '@/components/events/proposed-times-helpers';
import { PaywallModal } from '@/components/purchases/paywall-modal';
import { formatMutationError } from '@/lib/convex/format-mutation-error';
import { isTooManyActiveEventsError } from '@/lib/convex/subscription-errors';
import { isConvexConfigured } from '@/lib/convex/client';
import { useCalendarConflicts } from '@/hooks/use-calendar-conflicts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCreateEventGate } from '@/hooks/use-create-event-gate';

const createEventMutation = makeFunctionReference<'mutation'>('events:create');

/** Modal stack header ~height for iOS keyboard avoidance (avoid @react-navigation/* on Expo SDK 56 web export). */
const IOS_MODAL_KEYBOARD_HEADER_OFFSET = 56;

type PickerTarget = { kind: 'deadline' } | { kind: 'slot'; index: number };

export default function CreateEventScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const webScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const configured = isConvexConfigured();
  const defaults = useMemo(() => buildDefaultEventSlots(), []);
  const rangeDefaults = useMemo(() => buildDefaultRangeEvent(), []);
  const [schedulingMode, setSchedulingMode] = useState<'discrete' | 'range'>('discrete');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slotStarts, setSlotStarts] = useState<number[]>(defaults.slotStarts);
  const [rangeWindows, setRangeWindows] = useState<RangeWindow[]>(rangeDefaults.rangeWindows);
  const [deadline, setDeadline] = useState(defaults.deadline);
  const [allowInviteeProposals, setAllowInviteeProposals] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickerRef = useRef<PickerTarget | null>(null);
  useEffect(() => {
    pickerRef.current = picker;
  }, [picker]);

  const createEvent = useMutation(createEventMutation);
  const { paywallVisible, closePaywall, openPaywall, subscription } = useCreateEventGate();
  const calendarConflicts = useCalendarConflicts(slotStarts);

  const onCheckCalendar = useCallback(() => {
    if (subscription.isLoaded && !subscription.isPro) {
      openPaywall();
      return;
    }
    void calendarConflicts.checkCalendar();
  }, [calendarConflicts, openPaywall, subscription.isLoaded, subscription.isPro]);

  const onSelectSchedulingMode = useCallback(
    (mode: 'discrete' | 'range') => {
      if (mode === 'range' && subscription.isLoaded && !subscription.isPro) {
        openPaywall();
        return;
      }
      setSchedulingMode(mode);
      if (mode === 'range') {
        setDeadline(rangeDefaults.deadline);
        setRangeWindows(rangeDefaults.rangeWindows);
      }
    },
    [openPaywall, rangeDefaults, subscription.isLoaded, subscription.isPro],
  );

  useEffect(() => {
    if (subscription.isLoaded && subscription.isPro) {
      setRemindersEnabled(true);
    }
    if (subscription.isLoaded && !subscription.isPro) {
      setRemindersEnabled(false);
    }
  }, [subscription.isLoaded, subscription.isPro]);

  const onRemindersToggle = useCallback(
    (next: boolean) => {
      if (next && subscription.isLoaded && !subscription.isPro) {
        openPaywall();
        return;
      }
      setRemindersEnabled(next);
    },
    [openPaywall, subscription.isLoaded, subscription.isPro],
  );

  const pickerValue = useMemo(() => {
    if (picker == null) {
      return new Date(0);
    }
    if (picker.kind === 'deadline') {
      return new Date(deadline);
    }
    const ms = slotStarts[picker.index] ?? slotStarts[0] ?? 0;
    return new Date(ms);
  }, [picker, deadline, slotStarts]);

  const onPickerChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' && Platform.OS === 'android') {
      setPicker(null);
      return;
    }
    if (date == null) {
      return;
    }
    const target = pickerRef.current;
    const roundedMs = roundTimeMs(date.getTime());
    if (target?.kind === 'deadline') {
      setDeadline(roundedMs);
    } else if (target?.kind === 'slot') {
      setSlotStarts((rows) => {
        const next = [...rows];
        next[target.index] = roundedMs;
        return next;
      });
    }
    if (Platform.OS === 'android') {
      setPicker(null);
    }
  }, []);

  const addSlot = useCallback(() => {
    setSlotStarts((rows) => {
      if (rows.length >= EVENT_MAX_SLOTS) {
        return rows;
      }
      const last = rows[rows.length - 1] ?? Date.now();
      const newIndex = rows.length;
      const next = [...rows, last + EVENT_HOUR_MS];
      if (Platform.OS !== 'web') {
        queueMicrotask(() => {
          setPicker({ kind: 'slot', index: newIndex });
        });
      }
      return next;
    });
  }, []);

  const addSuggestedSlot = useCallback((startTimeMs: number) => {
    setSlotStarts((rows) => {
      if (rows.length >= EVENT_MAX_SLOTS) {
        return rows;
      }
      return [...rows, startTimeMs];
    });
  }, []);

  const removeSlot = useCallback((index: number) => {
    setPicker(null);
    setSlotStarts((rows) => {
      if (rows.length <= 2) {
        return rows;
      }
      return rows.filter((_, i) => i !== index);
    });
  }, []);

  const onSubmit = useCallback(async () => {
    setError(null);
    const msg = validateEventForm({ title, slotStarts, deadline });
    if (msg != null) {
      setError(msg);
      return;
    }
    if (subscription.isLoaded && !subscription.canCreateMore) {
      openPaywall();
      return;
    }
    setSubmitting(true);
    try {
      const desc = description.trim();
      const id = await createEvent({
        title: title.trim(),
        description: desc.length > 0 ? desc : undefined,
        timeslotStarts: slotStarts,
        deadline,
        allowInviteeProposals,
        remindersEnabled: subscription.isPro ? remindersEnabled : false,
      });
      router.replace(`/event/${id}`);
    } catch (e: unknown) {
      const message = formatMutationError(e, 'Could not create event');
      setError(message);
      if (isTooManyActiveEventsError(e)) {
        openPaywall();
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    allowInviteeProposals,
    createEvent,
    deadline,
    description,
    openPaywall,
    rangeWindows,
    remindersEnabled,
    schedulingMode,
    slotStarts,
    subscription.canCreateMore,
    subscription.isLoaded,
    subscription.isPro,
    title,
  ]);

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          Set EXPO_PUBLIC_CONVEX_URL in your environment to create events.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-black"
      keyboardVerticalOffset={Platform.OS === 'ios' ? IOS_MODAL_KEYBOARD_HEADER_OFFSET : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</Text>
        <TextInput
          accessibilityLabel="Event title"
          className="mb-4 rounded-lg border border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          editable={!submitting}
          maxLength={200}
          onChangeText={setTitle}
          placeholder="Weekend hike"
          placeholderTextColor="#9ca3af"
          value={title}
        />

        <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</Text>
        <TextInput
          accessibilityLabel="Optional event description"
          className="mb-4 min-h-[88px] rounded-lg border border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          editable={!submitting}
          maxLength={4000}
          multiline
          onChangeText={setDescription}
          placeholder="Optional details for invitees"
          placeholderTextColor="#9ca3af"
          textAlignVertical="top"
          value={description}
        />

        <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Scheduling</Text>
        <View className="mb-4 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discrete times"
            accessibilityState={{ selected: schedulingMode === 'discrete' }}
            className={`flex-1 rounded-lg border px-3 py-3 ${
              schedulingMode === 'discrete'
                ? 'border-[#FF6B5C] bg-[#FF6B5C]/10'
                : 'border-neutral-300 dark:border-neutral-600'
            }`}
            disabled={submitting}
            onPress={() => {
              onSelectSchedulingMode('discrete');
            }}
          >
            <Text className="text-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Discrete times
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Availability window, Agree plus feature"
            accessibilityState={{ selected: schedulingMode === 'range' }}
            className={`flex-1 rounded-lg border px-3 py-3 ${
              schedulingMode === 'range'
                ? 'border-[#FF6B5C] bg-[#FF6B5C]/10'
                : 'border-neutral-300 dark:border-neutral-600'
            }`}
            disabled={submitting}
            onPress={() => {
              onSelectSchedulingMode('range');
            }}
          >
            <Text className="text-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Availability window
            </Text>
            <Text className="mt-0.5 text-center text-[10px] text-neutral-500">Agree+</Text>
          </Pressable>
        </View>

        {schedulingMode === 'range' ? (
          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Availability windows
            </Text>
            <RangeWindowEditor
              colorScheme={webScheme}
              disabled={submitting}
              windows={rangeWindows}
              onAddWindow={() => {
                const last = rangeWindows[rangeWindows.length - 1];
                const offset = 24 * 60 * 60 * 1000;
                const start = (last?.endBound ?? Date.now()) + offset;
                setRangeWindows((rows) => [...rows, { startBound: start, endBound: start + 12 * 60 * 60 * 1000 }]);
              }}
              onChangeWindow={(index, window) => {
                setRangeWindows((rows) => {
                  const next = [...rows];
                  next[index] = window;
                  return next;
                });
              }}
              onRemoveWindow={(index) => {
                setRangeWindows((rows) => rows.filter((_, i) => i !== index));
              }}
            />
          </View>
        ) : (
          <>
        <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Proposed times</Text>

        <ProposedTimesHelpers
          ai={{
            deadlineMs: deadline,
            disabled: submitting,
            existingSlotMs: slotStarts,
            isLoaded: subscription.isLoaded,
            isPro: subscription.isPro,
            slotCount: slotStarts.length,
            onAddSlot: addSuggestedSlot,
            onOpenPaywall: openPaywall,
          }}
          calendar={{
            disabled: submitting,
            errorMessage: calendarConflicts.errorMessage,
            status: calendarConflicts.status,
            onPressCheck: onCheckCalendar,
          }}
        />

        <Text className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          At least 2 times, up to {EVENT_MAX_SLOTS}. Voting must end before your latest time.{' '}
          {Platform.OS === 'web'
            ? 'Use the date and time fields below each row to change a slot.'
            : 'Tap a time to open the picker; new rows open the picker automatically.'}
        </Text>
        {slotStarts.map((ms, index) => {
          const label = `Proposed time ${index + 1}, ${formatDateTimeMs(ms)}. Opens date and time picker.`;
          const hasConflict = calendarConflicts.conflictingIndexes.has(index);
          return (
            <View key={`slot-row-${String(index)}`} className="mb-2">
              <View className="flex-row items-center gap-2">
              {Platform.OS === 'web' ? (
                <View className="flex-1">
                  <WebDatetimeLocalInput
                    accessibilityLabel={`Proposed time ${String(index + 1)}`}
                    colorScheme={webScheme}
                    disabled={submitting}
                    valueMs={ms}
                    onChangeMs={(nextMs) => {
                      setSlotStarts((rows) => {
                        const next = [...rows];
                        next[index] = nextMs;
                        return next;
                      });
                    }}
                  />
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-3 dark:border-neutral-600 dark:bg-neutral-900"
                  disabled={submitting}
                  onPress={() => {
                    setPicker({ kind: 'slot', index });
                  }}
                >
                  <Text className="text-base text-neutral-900 dark:text-neutral-100">{formatDateTimeMs(ms)}</Text>
                </Pressable>
              )}
              {slotStarts.length > 2 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove proposed time ${String(index + 1)}`}
                  className="rounded-lg border border-neutral-300 px-3 py-3 dark:border-neutral-600"
                  disabled={submitting}
                  onPress={() => {
                    removeSlot(index);
                  }}
                >
                  <Text className="text-base text-neutral-700 dark:text-neutral-300">Remove</Text>
                </Pressable>
              ) : null}
              </View>
              <CalendarConflictBadge visible={hasConflict} />
            </View>
          );
        })}

        {slotStarts.length < EVENT_MAX_SLOTS ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add another proposed time"
            className="mb-6 self-start rounded-lg border border-dashed border-neutral-400 px-3 py-2 dark:border-neutral-500"
            disabled={submitting}
            onPress={addSlot}
          >
            <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">+ Add time</Text>
          </Pressable>
        ) : (
          <Text className="mb-6 text-xs text-neutral-500 dark:text-neutral-400">Maximum {EVENT_MAX_SLOTS} times reached.</Text>
        )}
          </>
        )}

        <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Voting deadline</Text>
        {Platform.OS === 'web' ? (
          <View className="mb-6">
            <WebDatetimeLocalInput
              accessibilityLabel="Voting deadline"
              colorScheme={webScheme}
              disabled={submitting}
              valueMs={deadline}
              onChangeMs={setDeadline}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Voting deadline, ${formatDateTimeMs(deadline)}. Opens date and time picker.`}
            className="mb-6 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-3 dark:border-neutral-600 dark:bg-neutral-900"
            disabled={submitting}
            onPress={() => {
              setPicker({ kind: 'deadline' });
            }}
          >
            <Text className="text-base text-neutral-900 dark:text-neutral-100">{formatDateTimeMs(deadline)}</Text>
          </Pressable>
        )}

        {schedulingMode === 'discrete' ? (
          <View className="mb-6 flex-row items-center justify-between gap-3">
            <Text className="shrink text-base text-neutral-900 dark:text-neutral-100">
              Allow invitees to propose times
            </Text>
            <Switch
              accessibilityLabel="Allow invitees to propose times"
              disabled={submitting}
              onValueChange={setAllowInviteeProposals}
              value={allowInviteeProposals}
            />
          </View>
        ) : null}

        <View className="mb-6 flex-row items-center justify-between gap-3">
          <View className="shrink">
            <Text className="text-base text-neutral-900 dark:text-neutral-100">Automatic reminders</Text>
            <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Email invitees who have not voted 48h and 24h before the deadline. Agree+ only.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Send automatic vote reminders to invitees"
            disabled={submitting}
            onValueChange={onRemindersToggle}
            value={remindersEnabled}
          />
        </View>


        {picker != null && Platform.OS === 'ios' ? (
          <View className="mb-4">
            <View className="mb-2 flex-row justify-end">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close date and time picker"
                className="px-3 py-2"
                onPress={() => {
                  setPicker(null);
                }}
              >
                <Text className="text-base font-semibold text-[#FF6B5C]">Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              display="spinner"
              minuteInterval={EVENT_TIME_MINUTE_INTERVAL}
              mode="datetime"
              themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
              value={pickerValue}
              onChange={onPickerChange}
            />
          </View>
        ) : null}

        {picker != null && Platform.OS === 'android' ? (
          <DateTimePicker
            display="default"
            minuteInterval={EVENT_TIME_MINUTE_INTERVAL}
            mode="datetime"
            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
            value={pickerValue}
            onChange={onPickerChange}
          />
        ) : null}

        {error != null ? (
          <Text
            accessibilityLiveRegion="polite"
            className="mb-3 text-base text-red-600 dark:text-red-400"
            importantForAccessibility="yes"
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={submitting ? 'Creating event' : 'Create event'}
          accessibilityState={{ disabled: submitting }}
          className="mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-[#FF6B5C] py-4 active:opacity-90 disabled:opacity-50"
          disabled={submitting}
          onPress={() => void onSubmit()}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : null}
          <Text className="text-center text-lg font-semibold text-white">
            {submitting ? 'Creating…' : 'Create event'}
          </Text>
        </Pressable>
      </ScrollView>
      <PaywallModal visible={paywallVisible} onClose={closePaywall} />
    </KeyboardAvoidingView>
  );
}
