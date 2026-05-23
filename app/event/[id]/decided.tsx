import type { ReactElement } from 'react';
import { useCallback, useMemo } from 'react';
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
import { makeFunctionReference } from 'convex/server';
import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCalendarButton } from '@/components/events/add-to-calendar-button';
import { buildVoteUrl } from '@/lib/events/build-share-url';
import { formatTimeslotWithTimezone } from '@/lib/events/format-event-home';
import { isConvexConfigured } from '@/lib/convex/client';
import { t } from '@/lib/i18n/t';

const getForOwnerQuery = makeFunctionReference<'query'>('events:getForOwner');

export default function EventDecidedScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const rawId = useLocalSearchParams<{ id: string; startTimeMs?: string }>();
  const id = Array.isArray(rawId.id) ? rawId.id[0] : rawId.id;
  const startTimeMsParam = Array.isArray(rawId.startTimeMs) ? rawId.startTimeMs[0] : rawId.startTimeMs;
  const configured = isConvexConfigured();

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
    if (event == null || typeof event !== 'object' || !('shareToken' in event)) {
      return;
    }
    const title = String(event.title);
    const shareToken = String(event.shareToken);
    const url = buildVoteUrl(shareToken);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(url);
        Alert.alert('Voting link copied to clipboard');
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
  }, [event]);

  if (!configured || id == null || id.length === 0) {
    return (
      <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
        <Text className="text-base text-neutral-700 dark:text-neutral-300">
          Set EXPO_PUBLIC_CONVEX_URL in your environment to load events from Convex.
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
        <Text className="text-base text-neutral-700 dark:text-neutral-300">
          {t('pick_time_host_only')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('decided_back_a11y')}
          className="mt-6 min-h-[44px] items-center justify-center self-start rounded-lg bg-neutral-200 px-4 dark:bg-neutral-800"
          onPress={() => router.replace(`/event/${id}`)}
        >
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {t('decided_back')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const title = String(event.title);
  const timeLabel = formatTimeslotWithTimezone(decidedStartTimeMs);
  const description =
    typeof event.description === 'string' && event.description.length > 0
      ? event.description
      : undefined;

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{
        padding: 16,
        paddingTop: 12,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Text
        allowFontScaling
        className="text-2xl font-bold text-neutral-900 dark:text-neutral-100"
        accessibilityRole="header"
        maxFontSizeMultiplier={2}
      >
        {t('decided_title')}
      </Text>
      <Text
        allowFontScaling
        className="mt-2 text-base text-neutral-600 dark:text-neutral-400"
        maxFontSizeMultiplier={2}
      >
        {t('decided_subtitle')}
      </Text>

      <View className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Text
          allowFontScaling
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          maxFontSizeMultiplier={2}
        >
          {title}
        </Text>
        <Text
          allowFontScaling
          className="mt-2 text-base text-neutral-800 dark:text-neutral-200"
          maxFontSizeMultiplier={2}
        >
          {t('decided_time_line', { time: timeLabel })}
        </Text>
      </View>

      <View className="mt-6">
        <AddToCalendarButton
          event={{
            title,
            startTimeMs: decidedStartTimeMs,
            notes: description,
          }}
          eventId={id}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('decided_share_a11y')}
        className="mt-3 min-h-[44px] items-center justify-center rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3.5 active:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-900 dark:active:bg-neutral-800"
        onPress={() => void onShare()}
      >
        <Text
          allowFontScaling
          className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-100"
          maxFontSizeMultiplier={2}
        >
          {t('decided_share')}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('decided_back_a11y')}
        className="mt-6 min-h-[44px] items-center justify-center"
        onPress={() => router.replace(`/event/${id}`)}
      >
        <Text
          allowFontScaling
          className="text-sm font-semibold text-neutral-600 dark:text-neutral-400"
          maxFontSizeMultiplier={2}
        >
          {t('decided_back')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
