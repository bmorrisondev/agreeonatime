import type { ReactElement } from 'react';
import { makeFunctionReference } from 'convex/server';
import { useQuery } from 'convex/react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { formatDecidedTime } from '@/lib/events/format-event-home';

const getForOwnerQuery = makeFunctionReference<'query'>('events:getForOwner');

/**
 * Owner event detail placeholder until DEV-387.
 */
export default function EventDetailScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useQuery(
    getForOwnerQuery,
    id != null && id.length > 0 ? { eventId: id } : 'skip',
  );

  if (event === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (event === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-base text-neutral-600 dark:text-neutral-400">
          Event not found or you do not have access.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-4 pt-4 dark:bg-black">
      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{event.title}</Text>
      {event.description != null && event.description.length > 0 ? (
        <Text className="mt-2 text-base text-neutral-700 dark:text-neutral-300">{event.description}</Text>
      ) : null}
      <Text className="mt-4 text-sm font-medium uppercase text-neutral-500 dark:text-neutral-400">
        Status: {event.status}
      </Text>
      {event.decidedStartTime != null ? (
        <Text className="mt-2 text-base text-neutral-800 dark:text-neutral-200">
          {formatDecidedTime(event.decidedStartTime)}
        </Text>
      ) : null}
      <Text className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
        Full owner detail (timeslots, votes, share) ships in DEV-387.
      </Text>
    </View>
  );
}
