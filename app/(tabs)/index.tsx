import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, router } from 'expo-router';

import { authClient } from '@/lib/auth-client';
import { isConvexConfigured } from '@/lib/convex/client';
import { useAppStore } from '@/lib/store/app-store';

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const bootstrapDemoSeen = useAppStore((s) => s.bootstrapDemoSeen);
  const setBootstrapDemoSeen = useAppStore((s) => s.setBootstrapDemoSeen);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <View className="mb-4 rounded-xl bg-[#FF6B5C]/15 p-4 dark:bg-[#FF6B5C]/25">
        <Text className="text-base text-neutral-900 dark:text-neutral-100">
          NativeWind + Zustand/MMKV (DEV-380):{' '}
          <Text className="font-semibold">{bootstrapDemoSeen ? 'saved' : 'not saved'}</Text>
          {' · '}
          Convex (DEV-381):{' '}
          <Text className="font-semibold">
            {isConvexConfigured() ? 'URL set' : 'not configured'}
          </Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle bootstrap persistence demo"
          className="mt-3 self-start rounded-lg bg-[#FF6B5C] px-3 py-2 active:opacity-80"
          onPress={() => setBootstrapDemoSeen(!bootstrapDemoSeen)}
        >
          <Text className="font-medium text-white">Toggle persisted flag</Text>
        </Pressable>
        {session?.user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            className="mt-3 self-start rounded-lg border border-neutral-400 px-3 py-2 dark:border-neutral-500"
            onPress={() => {
              void (async () => {
                await authClient.signOut();
                router.replace('/sign-in');
              })();
            }}
          >
            <Text className="font-medium text-neutral-900 dark:text-neutral-100">Sign out</Text>
          </Pressable>
        ) : null}
      </View>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
