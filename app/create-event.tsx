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
import {
  buildDefaultEventSlots,
  EVENT_HOUR_MS,
  EVENT_MAX_SLOTS,
  validateEventForm,
} from '@/lib/events/event-form';
import { WebDatetimeLocalInput } from '@/lib/events/web-datetime-local';
import { PaywallModal } from '@/components/purchases/paywall-modal';
import { formatMutationError } from '@/lib/convex/format-mutation-error';
import { isConvexConfigured } from '@/lib/convex/client';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slotStarts, setSlotStarts] = useState<number[]>(defaults.slotStarts);
  const [deadline, setDeadline] = useState(defaults.deadline);
  const [allowInviteeProposals, setAllowInviteeProposals] = useState(true);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickerRef = useRef<PickerTarget | null>(null);
  useEffect(() => {
    pickerRef.current = picker;
  }, [picker]);

  const createEvent = useMutation(createEventMutation);
  const { paywallVisible, closePaywall, openPaywall, subscription } = useCreateEventGate();

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
    if (target?.kind === 'deadline') {
      setDeadline(date.getTime());
    } else if (target?.kind === 'slot') {
      setSlotStarts((rows) => {
        const next = [...rows];
        next[target.index] = date.getTime();
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
      });
      router.replace(`/event/${id}`);
    } catch (e: unknown) {
      const message = formatMutationError(e, 'Could not create event');
      setError(message);
      if (message.includes('one active event')) {
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
    slotStarts,
    subscription.canCreateMore,
    subscription.isLoaded,
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

        <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Proposed times</Text>
        <Text className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
          At least 2 times, up to {EVENT_MAX_SLOTS}. Voting must end before your latest time.{' '}
          {Platform.OS === 'web'
            ? 'Use the date and time fields below each row to change a slot.'
            : 'Tap a time to open the picker; new rows open the picker automatically.'}
        </Text>

        {slotStarts.map((ms, index) => {
          const label = `Proposed time ${index + 1}, ${formatDateTimeMs(ms)}. Opens date and time picker.`;
          return (
            <View key={`slot-row-${String(index)}`} className="mb-2 flex-row items-center gap-2">
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
