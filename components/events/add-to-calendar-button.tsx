import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text } from 'react-native';

import type { CalendarEventInput } from '@/lib/calendar/calendar-event';
import { openAddToCalendar } from '@/lib/calendar/open-add-to-calendar';
import { t } from '@/lib/i18n/t';

export interface AddToCalendarButtonProps {
  readonly event: CalendarEventInput;
  /** Stable id for ICS UID (e.g. Convex event id). */
  readonly eventId?: string;
  readonly variant?: 'primary' | 'secondary';
  readonly className?: string;
}

export function AddToCalendarButton({
  event,
  eventId,
  variant = 'primary',
  className,
}: AddToCalendarButtonProps): ReactElement {
  const [busy, setBusy] = useState(false);

  const onPress = useCallback(async () => {
    setBusy(true);
    try {
      const uid =
        eventId != null && eventId.length > 0
          ? `agreeonatime-${eventId}@agreeonatime.com`
          : undefined;
      await openAddToCalendar(event, { uid });
    } catch {
      Alert.alert(t('add_to_calendar_error_title'), t('add_to_calendar_error_body'));
    } finally {
      setBusy(false);
    }
  }, [event, eventId]);

  const isPrimary = variant === 'primary';
  const baseClass = isPrimary
    ? 'bg-[#FF6B5C] active:opacity-90'
    : 'border border-neutral-300 bg-neutral-50 active:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-900 dark:active:bg-neutral-800';
  const textClass = isPrimary
    ? 'text-white'
    : 'text-neutral-900 dark:text-neutral-100';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('add_to_calendar_a11y')}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      className={[
        'min-h-[44px] items-center justify-center rounded-xl px-4 py-3.5',
        baseClass,
        busy ? 'opacity-60' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onPress={() => void onPress()}
    >
      {busy ? (
        <ActivityIndicator color={isPrimary ? '#fff' : undefined} />
      ) : (
        <Text
          allowFontScaling
          className={`text-center text-base font-semibold ${textClass}`}
          maxFontSizeMultiplier={2}
        >
          {t('add_to_calendar')}
        </Text>
      )}
    </Pressable>
  );
}
