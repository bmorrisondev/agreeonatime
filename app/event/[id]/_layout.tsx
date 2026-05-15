import type { ReactElement } from 'react';
import { Stack } from 'expo-router';

import { StackHeaderBack } from '@/components/navigation/stack-header-back';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BRAND = '#FF6B5C';

export default function EventIdLayout(): ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Event',
        headerShadowVisible: false,
        headerTintColor: BRAND,
        headerStyle: { backgroundColor: isDark ? '#000000' : '#ffffff' },
        headerTitleStyle: {
          color: isDark ? '#fafafa' : '#171717',
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Event',
          headerLeft: () => <StackHeaderBack fallbackHref="/(tabs)" label="Home" />,
        }}
      />
      <Stack.Screen name="pick-time" options={{ title: 'Pick a time' }} />
    </Stack>
  );
}
