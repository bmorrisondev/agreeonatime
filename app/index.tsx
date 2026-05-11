import type { ReactElement } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useConvexAuth } from 'convex/react';

import { isConvexConfigured } from '@/lib/convex/client';

function IndexWithConvexAuth(): ReactElement {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}

export default function Index(): ReactElement {
  if (!isConvexConfigured()) {
    return <Redirect href="/(tabs)" />;
  }

  return <IndexWithConvexAuth />;
}
