import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useConvex, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
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
};

type FlatRow =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'event'; key: string; event: HomeEventRow };

function HomeScreenContent(): ReactElement {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const convex = useConvex();
  const insets = useSafeAreaInsets();

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
    const line2 = formatVoteSummary(e.yesVotes, e.noVotes);
    let line1: string;
    if (e.status === 'decided' && e.decidedStartTime != null) {
      line1 = formatDecidedTime(e.decidedStartTime);
    } else if (e.status === 'open') {
      line1 = `Closes ${formatDeadlineLine(e.deadline, nowMs)}`;
    } else {
      line1 = 'Archived';
    }
    const a11y = `Event: ${e.title}. ${line1}. ${line2}. ${e.timeslotCount} proposed times. Double tap to open.`;
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
        <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-500">{line2}</Text>
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

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View
        className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-4 pb-2 dark:border-neutral-800 dark:bg-black"
        style={{ paddingTop: insets.top + 4 }}
      >
        <Text className="text-display font-bold text-neutral-900 dark:text-neutral-100">
          Home
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings_gear_a11y')}
          hitSlop={8}
          onPress={() => router.push('/settings')}
        >
          <IconSymbol name="gearshape.fill" size={24} color="#A3A3A3" />
        </Pressable>
      </View>
      <FlatList
        className="flex-1"
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        ListEmptyComponent={
          isEmpty ? (
            <View className="flex-1 items-center justify-center px-8 py-24">
              <Text className="text-center text-lg text-neutral-700 dark:text-neutral-300">
                No events yet. Tap + to plan something.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + 88,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create new event"
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-[#FF6B5C] shadow-md active:opacity-90"
        style={{ bottom: insets.bottom + 72 }}
        onPress={() => {
          router.push('/create-event');
        }}
      >
        <Text className="text-3xl font-light text-white">+</Text>
      </Pressable>
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
