import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ONBOARDING_ACCENT, ONBOARDING_BG, ONBOARDING_DOT_INACTIVE, ONBOARDING_MUTED } from '@/components/onboarding/onboarding-theme';
import { formatDateTimeMs } from '@/lib/events/format-event-home';
import {
  buildDefaultEventSlots,
  EVENT_HOUR_MS,
  EVENT_MAX_SLOTS,
  validateEventForm,
} from '@/lib/events/event-form';
import { WebDatetimeLocalInput } from '@/lib/events/web-datetime-local';
import type { OnboardingEventDraft } from '@/lib/onboarding/onboarding-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PickerTarget = { kind: 'deadline' } | { kind: 'slot'; index: number };

export type GuideFocus = 'deadline' | 'slots' | 'title';

export interface OnboardingGuidedEventProps {
  readonly onBack: () => void;
  readonly onSaveDraft: (draft: OnboardingEventDraft) => void;
}

export function OnboardingGuidedEvent(props: OnboardingGuidedEventProps): ReactElement {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const webScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const defaults = useMemo(() => buildDefaultEventSlots(), []);
  const [title, setTitle] = useState('');
  const [slotStarts, setSlotStarts] = useState<number[]>(defaults.slotStarts);
  const [deadline, setDeadline] = useState(defaults.deadline);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [guideFocus, setGuideFocus] = useState<GuideFocus>('title');
  const pickerRef = useRef<PickerTarget | null>(null);
  const allowInviteeProposals = true;

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

  const validationMessage = useMemo(
    () => validateEventForm({ title, slotStarts, deadline }),
    [deadline, slotStarts, title],
  );
  const isValid = validationMessage == null;

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

  const tooltipCopy = useMemo((): { readonly message: string } => {
    if (guideFocus === 'title') {
      return { message: 'Name your poll so invitees know what they are voting on.' };
    }
    if (guideFocus === 'slots') {
      return { message: 'Add at least two times you can meet. Tap a row to change it.' };
    }
    return { message: 'Set when voting closes — it must be before your latest proposed time.' };
  }, [guideFocus]);

  const onSave = useCallback(() => {
    if (!isValid) {
      return;
    }
    props.onSaveDraft({
      title: title.trim(),
      description: '',
      slotStarts: [...slotStarts],
      deadline,
      allowInviteeProposals,
    });
  }, [allowInviteeProposals, deadline, isValid, props, slotStarts, title]);

  const syncGuideFocus = useCallback(() => {
    if (title.trim().length === 0) {
      setGuideFocus('title');
      return;
    }
    const slotErr =
      slotStarts.length < 2 || slotStarts.length > EVENT_MAX_SLOTS
        ? 'slots'
        : null;
    if (slotErr != null) {
      setGuideFocus('slots');
      return;
    }
    const now = Date.now();
    if (deadline <= now) {
      setGuideFocus('deadline');
      return;
    }
    const latest = Math.max(...slotStarts);
    if (deadline >= latest) {
      setGuideFocus('deadline');
      return;
    }
    setGuideFocus('deadline');
  }, [deadline, slotStarts, title]);

  useEffect(() => {
    pickerRef.current = picker;
  }, [picker]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: ONBOARDING_BG, paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Pressable
          accessibilityLabel="Close guided setup and go to sign in"
          accessibilityRole="button"
          hitSlop={12}
          onPress={props.onBack}
        >
          <Text className="text-base font-semibold" style={{ color: ONBOARDING_MUTED }}>
            Back
          </Text>
        </Pressable>
        <Text className="text-center text-base font-semibold text-white">Create your first event</Text>
        <View className="w-12" />
      </View>

      <Animated.View entering={FadeIn.duration(320)} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 28,
          }}
        >
          <View className="mb-4 self-stretch rounded-xl px-4 py-3" style={{ backgroundColor: ONBOARDING_ACCENT }}>
            <Text className="text-center text-base font-medium text-white">{tooltipCopy.message}</Text>
            <View
              className="absolute -bottom-2 left-10 h-3 w-3 rotate-45"
              style={{ backgroundColor: ONBOARDING_ACCENT }}
            />
          </View>

          <Text className="mb-1 text-sm font-medium" style={{ color: ONBOARDING_MUTED }}>
            Event name
          </Text>
          <TextInput
            accessibilityLabel="Event title"
            className="mb-4 rounded-xl px-4 py-3 text-base text-white"
            onBlur={syncGuideFocus}
            onChangeText={(t) => {
              setTitle(t);
              if (t.trim().length > 0) {
                setGuideFocus('slots');
              }
            }}
            onFocus={() => {
              setGuideFocus('title');
            }}
            placeholder="Weekend hike"
            placeholderTextColor={ONBOARDING_MUTED}
            style={{
              borderWidth: guideFocus === 'title' ? 2 : 1,
              borderColor: guideFocus === 'title' ? ONBOARDING_ACCENT : ONBOARDING_DOT_INACTIVE,
              backgroundColor: '#252344',
            }}
            value={title}
          />

          <Text className="mb-1 text-sm font-medium" style={{ color: ONBOARDING_MUTED }}>
            Proposed times
          </Text>
          <Text className="mb-2 text-xs" style={{ color: ONBOARDING_MUTED }}>
            At least two options. Tap a time to edit on your phone.
          </Text>

          {slotStarts.map((ms, index) => {
            const borderOn = guideFocus === 'slots';
            return (
              <View key={`slot-${String(index)}`} className="mb-2 flex-row items-center gap-2">
                {Platform.OS === 'web' ? (
                  <View className="min-h-[48px] flex-1 justify-center">
                    <WebDatetimeLocalInput
                      accessibilityLabel={`Proposed time ${String(index + 1)}`}
                      colorScheme={webScheme}
                      valueMs={ms}
                      onChangeMs={(nextMs) => {
                        setSlotStarts((rows) => {
                          const next = [...rows];
                          next[index] = nextMs;
                          return next;
                        });
                        setGuideFocus('slots');
                      }}
                    />
                  </View>
                ) : (
                  <Pressable
                    accessibilityLabel={`Proposed time ${String(index + 1)}`}
                    accessibilityRole="button"
                    className="flex-1 rounded-xl px-4 py-3"
                    style={{
                      borderWidth: borderOn ? 2 : 1,
                      borderColor: borderOn ? ONBOARDING_ACCENT : ONBOARDING_DOT_INACTIVE,
                      backgroundColor: '#252344',
                    }}
                    onPress={() => {
                      setGuideFocus('slots');
                      setPicker({ kind: 'slot', index });
                    }}
                  >
                    <Text className="text-base text-white">{formatDateTimeMs(ms)}</Text>
                  </Pressable>
                )}
                {slotStarts.length > 2 ? (
                  <Pressable
                    accessibilityLabel={`Remove proposed time ${String(index + 1)}`}
                    accessibilityRole="button"
                    className="rounded-xl px-3 py-3"
                    style={{ borderWidth: 1, borderColor: ONBOARDING_DOT_INACTIVE }}
                    onPress={() => {
                      removeSlot(index);
                    }}
                  >
                    <Text style={{ color: ONBOARDING_MUTED }}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {slotStarts.length < EVENT_MAX_SLOTS ? (
            <Pressable
              accessibilityLabel="Add another proposed time"
              accessibilityRole="button"
              className="mb-6 self-start rounded-xl px-3 py-2"
              style={{ borderWidth: 1, borderColor: ONBOARDING_DOT_INACTIVE, borderStyle: 'dashed' }}
              onPress={addSlot}
            >
              <Text style={{ color: ONBOARDING_MUTED }}>+ Add time</Text>
            </Pressable>
          ) : null}

          <Text className="mb-1 text-sm font-medium" style={{ color: ONBOARDING_MUTED }}>
            Voting deadline
          </Text>
          {Platform.OS === 'web' ? (
            <View className="mb-6 min-h-[48px]">
            <WebDatetimeLocalInput
              accessibilityLabel="Voting deadline"
              colorScheme={webScheme}
                valueMs={deadline}
                onChangeMs={(ms) => {
                  setDeadline(ms);
                  setGuideFocus('deadline');
                }}
              />
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Voting deadline"
              accessibilityRole="button"
              className="mb-6 rounded-xl px-4 py-3"
              style={{
                borderWidth: guideFocus === 'deadline' ? 2 : 1,
                borderColor: guideFocus === 'deadline' ? ONBOARDING_ACCENT : ONBOARDING_DOT_INACTIVE,
                backgroundColor: '#252344',
              }}
              onPress={() => {
                setGuideFocus('deadline');
                setPicker({ kind: 'deadline' });
              }}
            >
              <Text className="text-base text-white">{formatDateTimeMs(deadline)}</Text>
            </Pressable>
          )}

          {picker != null && Platform.OS === 'ios' ? (
            <View className="mb-4">
              <View className="mb-2 flex-row justify-end">
                <Pressable
                  accessibilityLabel="Close date and time picker"
                  accessibilityRole="button"
                  className="px-3 py-2"
                  onPress={() => {
                    setPicker(null);
                  }}
                >
                  <Text className="text-base font-semibold" style={{ color: ONBOARDING_ACCENT }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                display="spinner"
                mode="datetime"
                themeVariant="dark"
                value={pickerValue}
                onChange={onPickerChange}
              />
            </View>
          ) : null}

          {picker != null && Platform.OS === 'android' ? (
            <DateTimePicker display="default" mode="datetime" themeVariant="dark" value={pickerValue} onChange={onPickerChange} />
          ) : null}

          {validationMessage != null ? (
            <Text accessibilityLiveRegion="polite" className="mb-3 text-base text-red-400">
              {validationMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel="Save event and continue to sign up"
            accessibilityRole="button"
            accessibilityState={{ disabled: !isValid }}
            className="items-center rounded-2xl py-4"
            disabled={!isValid}
            style={{ backgroundColor: ONBOARDING_ACCENT, opacity: isValid ? 1 : 0.45 }}
            onPress={onSave}
          >
            <Text className="text-lg font-semibold text-white">Save event</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
