import type { ReactElement } from 'react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useConvex, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallModal } from '@/components/purchases/paywall-modal';
import { TabMainHeader } from '@/components/navigation/tab-main-header';
import { HomeHeaderCreateButton } from '@/components/navigation/home-header-create-button';
import { useCreateEventGate } from '@/hooks/use-create-event-gate';
import { isConvexConfigured } from '@/lib/convex/client';
import {
  formatDeadlineLine,
  formatDecidedTime,
  formatVoteSummary,
} from '@/lib/events/format-event-home';
import { t } from '@/lib/i18n/t';

const listForHomeQuery = makeFunctionReference<'query'>('events:listForHome');

type HomeEventRow = {
  _id: string;
  title: string;
  status: 'open' | 'closed' | 'decided';
  deadline: number;
  createdAt: number;
  timeslotCount: number;
  yesVotes: number;
  noVotes: number;
  decidedStartTime?: number;
  isHistoryLocked?: boolean;
};

type FlatRow =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'event'; key: string; event: HomeEventRow };

function HomeScreenContent(): ReactElement {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const convex = useConvex();
  const insets = useSafeAreaInsets();
  const { paywallVisible, closePaywall, openPaywall, requestCreate, subscription } =
    useCreateEventGate();

  const raw = useQuery(listForHomeQuery, { refreshNonce });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const next = refreshNonce + 1;
    setRefreshNonce(next);
    try {
      await convex.query(listForHomeQuery, { refreshNonce: next });
    } finally {
      setRefreshing(false);
    }
  }, [convex, refreshNonce]);

  const flatData = useMemo((): FlatRow[] => {
    if (raw == null || raw.groups == null) {
      return [];
    }
    const rows: FlatRow[] = [];
    for (const g of raw.groups) {
      rows.push({ kind: 'header', key: `h-${g.title}`, title: g.title });
      for (const e of g.events) {
        rows.push({ kind: 'event', key: e._id, event: e as HomeEventRow });
      }
    }
    return rows;
  }, [raw]);

  const isEmpty =
    raw !== undefined &&
    raw !== null &&
    (raw.groups?.length ?? 0) === 0;

  const renderItem = useCallback(({ item }: { item: FlatRow }) => {
    if (item.kind === 'header') {
      return (
        <View className="bg-neutral-100 px-4 py-2 dark:bg-neutral-900">
          <Text className="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400">
            {item.title}
          </Text>
        </View>
      );
    }
    const e = item.event;
    const nowMs = Date.now();
    const historyLocked = e.isHistoryLocked === true;
    const line2 = historyLocked
      ? t('home_history_locked_summary')
      : formatVoteSummary(e.yesVotes, e.noVotes);
    let line1: string;
    if (e.status === 'decided' && e.decidedStartTime != null) {
      line1 = formatDecidedTime(e.decidedStartTime);
    } else if (e.status === 'open') {
      line1 = `Closes ${formatDeadlineLine(e.deadline, nowMs)}`;
    } else {
      line1 = 'Archived';
    }
    const a11y = historyLocked
      ? `${e.title}. ${line1}. ${t('home_history_locked_a11y')}`
      : `Event: ${e.title}. ${line1}. ${line2}. ${e.timeslotCount} proposed times. Double tap to open.`;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        className="border-b border-neutral-200 bg-white px-4 py-3 active:bg-neutral-50 dark:border-neutral-800 dark:bg-black dark:active:bg-neutral-950"
        onPress={() => {
          router.push(`/event/${e._id}`);
        }}
      >
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{e.title}</Text>
        <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{line1}</Text>
        <Text
          className={`mt-0.5 text-sm ${
            historyLocked
              ? 'text-brand'
              : 'text-neutral-500 dark:text-neutral-500'
          }`}
        >
          {historyLocked ? t('home_history_locked_upgrade') : line2}
        </Text>
      </Pressable>
    );
  }, []);

  if (raw === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (raw === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          Sign in to see your events.
        </Text>
      </View>
    );
  }

  const buildLabel = process.env.EXPO_PUBLIC_BUILD_LABEL;
  const homeSubtitle =
    buildLabel != null && buildLabel.length > 0 ? t('home_build_subtitle', { label: buildLabel }) : undefined;

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <TabMainHeader
        subtitle={homeSubtitle}
        title={t('home_title')}
        rightAccessory={
          <HomeHeaderCreateButton
            accessibilityLabel="Create new event"
            onPress={() => {
              requestCreate(() => {
                router.push('/create-event');
              });
            }}
          />
        }
      />
      {subscription.isLoaded && !subscription.isPro && subscription.maxActiveEvents != null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home_active_events_banner_a11y', {
            count: subscription.activeOpenCount,
            max: subscription.maxActiveEvents,
          })}
          className="mx-4 mt-3 flex-row items-center justify-between rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 active:opacity-80 dark:border-brand/40 dark:bg-brand/15"
          onPress={openPaywall}
        >
          <View className="min-w-0 flex-1 pr-3">
            <Text
              allowFontScaling
              className="text-body font-semibold text-neutral-900 dark:text-neutral-100"
              maxFontSizeMultiplier={2}
            >
              {t('home_active_events_banner', {
                count: subscription.activeOpenCount,
                max: subscription.maxActiveEvents,
              })}
            </Text>
            <Text
              allowFontScaling
              className="mt-0.5 text-caption text-brand"
              maxFontSizeMultiplier={2}
            >
              {t('home_active_events_upgrade')}
            </Text>
          </View>
          <Text allowFontScaling className="text-lg text-brand" maxFontSizeMultiplier={2}>
            ›
          </Text>
        </Pressable>
      ) : null}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        {isEmpty ? (
          <View className="flex-1 items-center justify-center px-8 py-24">
            <Text className="text-center text-lg text-neutral-700 dark:text-neutral-300">
              {t('home_empty_cta')}
            </Text>
          </View>
        ) : (
          flatData.map((item) => (
            <Fragment key={item.key}>{renderItem({ item })}</Fragment>
          ))
        )}
      </ScrollView>
      <PaywallModal visible={paywallVisible} onClose={closePaywall} />
    </View>
  );
}

export default function HomeScreen(): ReactElement {
  if (!isConvexConfigured()) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
          Set EXPO_PUBLIC_CONVEX_URL in your environment to load your events from Convex.
        </Text>
      </View>
    );
  }

  return <HomeScreenContent />;
}
