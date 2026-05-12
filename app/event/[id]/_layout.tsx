import type { ReactElement } from 'react';
import { Stack } from 'expo-router';

export default function EventIdLayout(): ReactElement {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Event',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Event' }} />
      <Stack.Screen name="pick-time" options={{ title: 'Pick a time' }} />
    </Stack>
  );
}
