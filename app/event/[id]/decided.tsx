import type { ReactElement } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type View as ViewType,
} from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCalendarButton } from '@/components/events/add-to-calendar-button';
import { AgreedCardShareHost } from '@/components/events/agreed-card-share-host';
import { isConvexConfigured } from '@/lib/convex/client';
import { formatAgreedCardTime } from '@/lib/events/format-agreed-card-time';
import { shareAgreedCard } from '@/lib/events/share-agreed-card';
import { t } from '@/lib/i18n/t';

const getForOwnerQuery = makeFunctionReference<'query'>('events:getForOwner');

export default function EventDecidedScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const rawId = useLocalSearchParams<{ id: string; startTimeMs?: string }>();
  const id = Array.isArray(rawId.id) ? rawId.id[0] : rawId.id;
  const startTimeMsParam = Array.isArray(rawId.startTimeMs) ? rawId.startTimeMs[0] : rawId.startTimeMs;
  const configured = isConvexConfigured();
  const cardRef = useRef<ViewType>(null);
  const [sharing, setSharing] = useState(false);

  const event = useQuery(
    getForOwnerQuery,
    configured && id != null && id.length > 0 ? { eventId: id } : 'skip',
  );

  const decidedStartTimeMs = useMemo((): number | null => {
    if (event != null && event.decidedStartTime != null) {
      return event.decidedStartTime as number;
    }
    if (startTimeMsParam != null) {
      const parsed = Number(startTimeMsParam);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }, [event, startTimeMsParam]);

  const onShare = useCallback(async () => {
    if (event == null || decidedStartTimeMs == null) {
      return;
    }
    setSharing(true);
    try {
      await shareAgreedCard(cardRef, {
        title: event.title,
        decidedStartTimeMs,
      });
    } finally {
      setSharing(false);
    }
  }, [decidedStartTimeMs, event]);

  const onDone = useCallback(() => {
    if (id == null || id.length === 0) {
      router.replace('/(tabs)');
      return;
    }
    router.replace(`/event/${id}`);
  }, [id]);

  if (!configured || id == null || id.length === 0) {
    return (
      <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
        <Text allowFontScaling className="text-base text-neutral-700 dark:text-neutral-300" maxFontSizeMultiplier={2}>
          {t('pick_time_missing_event')}
        </Text>
      </View>
    );
  }

  if (event === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white dark:bg-black"
        accessibilityLabel={t('pick_time_loading_a11y')}
      >
        <ActivityIndicator size="large" accessibilityLabel={t('a11y_loading')} />
      </View>
    );
  }

  if (event === null || decidedStartTimeMs == null) {
    return (
      <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
        <Text allowFontScaling className="text-base text-neutral-700 dark:text-neutral-300" maxFontSizeMultiplier={2}>
          {t('pick_time_host_only')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('decided_done_a11y')}
          className="mt-6 min-h-[44px] items-center justify-center self-start rounded-lg bg-neutral-200 px-4 dark:bg-neutral-800"
          onPress={onDone}
        >
          <Text allowFontScaling className="text-sm font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            {t('decided_done')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (event.status !== 'decided') {
    return (
      <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
        <Text allowFontScaling className="text-base text-neutral-700 dark:text-neutral-300" maxFontSizeMultiplier={2}>
          {t('decided_not_ready')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pick_time_back_a11y')}
          className="mt-6 min-h-[44px] items-center justify-center self-start rounded-lg bg-neutral-200 px-4 dark:bg-neutral-800"
          onPress={onDone}
        >
          <Text allowFontScaling className="text-sm font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            {t('pick_time_back')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const whenLabel = formatAgreedCardTime(decidedStartTimeMs);
  const description =
    typeof event.description === 'string' && event.description.length > 0
      ? event.description
      : undefined;

  return (
    <View className="relative flex-1 bg-white dark:bg-black">
      <AgreedCardShareHost
        cardRef={cardRef}
        title={event.title}
        decidedStartTimeMs={decidedStartTimeMs}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
          justifyContent: 'center',
        }}
      >
        <Text
          allowFontScaling
          className="text-center text-sm font-bold uppercase tracking-wider text-brand"
          maxFontSizeMultiplier={2}
        >
          {t('decided_badge')}
        </Text>
        <Text
          allowFontScaling
          accessibilityRole="header"
          className="mt-3 text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100"
          maxFontSizeMultiplier={2}
        >
          {t('decided_title')}
        </Text>
        <Text
          allowFontScaling
          className="mt-2 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          maxFontSizeMultiplier={2}
        >
          {event.title}
        </Text>
        <Text
          allowFontScaling
          className="mt-2 text-center text-base text-neutral-600 dark:text-neutral-400"
          maxFontSizeMultiplier={2}
        >
          {whenLabel}
        </Text>
        <Text
          allowFontScaling
          className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400"
          maxFontSizeMultiplier={2}
        >
          {t('decided_subtitle')}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('decided_share_news_a11y')}
          disabled={sharing}
          className="mt-10 min-h-[44px] items-center justify-center rounded-lg bg-brand active:opacity-90 disabled:opacity-50"
          onPress={() => void onShare()}
        >
          {sharing ? (
            <ActivityIndicator color="#fff" accessibilityLabel={t('a11y_loading')} />
          ) : (
            <Text allowFontScaling className="text-base font-semibold text-white" maxFontSizeMultiplier={2}>
              {t('decided_share_news')}
            </Text>
          )}
        </Pressable>

        <View className="mt-3">
          <AddToCalendarButton
            event={{
              title: event.title,
              startTimeMs: decidedStartTimeMs,
              notes: description,
            }}
            eventId={id}
            variant="secondary"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('decided_done_a11y')}
          className="mt-4 min-h-[44px] items-center justify-center rounded-lg border border-neutral-300 bg-white active:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:active:bg-neutral-800"
          onPress={onDone}
        >
          <Text allowFontScaling className="text-base font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            {t('decided_done')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
