import type { ReactElement } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';

import { authClient, isAuthClientConfigured } from '@/lib/auth-client';
import { isConvexConfigured } from '@/lib/convex/client';

/** Magic links must use an http(s) URL on web — `Linking.createURL` often yields `exp://…`. Use `/sign-in` so redirects stay on a real route (avoids broken relative redirects). */
function getMagicLinkCallbackURL(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { origin, protocol } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      return `${origin}/sign-in`;
    }
  }
  return Linking.createURL('/sign-in');
}

export default function SignInScreen(): ReactElement {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isConvexConfigured() || !isAuthClientConfigured()) {
    return (
      <View className="flex-1 justify-center bg-white px-6 dark:bg-black">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Convex not configured
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-400">
          Add EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CONVEX_SITE_URL (see `.env.example`), then run{' '}
          <Text className="font-mono">pnpm convex:dev</Text>.
        </Text>
      </View>
    );
  }

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  }

  const onMagicLink = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
      const callbackURL = getMagicLinkCallbackURL();
      const result = await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL,
      });
      if (result.error) {
        setNotice(result.error.message ?? 'Could not send magic link.');
      } else {
        setNotice('Check your email for the sign-in link.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onApple = async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      setNotice('Sign in with Apple is available on iOS.');
      return;
    }

    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      setNotice('Sign in with Apple is not available on this device.');
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const token = credential.identityToken;
      if (token == null) {
        setNotice('Apple did not return an identity token.');
        return;
      }

      const result = await authClient.signIn.social({
        provider: 'apple',
        idToken: {
          token,
        },
      });

      if (result.error) {
        setNotice(result.error.message ?? 'Apple sign-in failed.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Apple sign-in cancelled.';
      setNotice(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-white px-6 dark:bg-black">
      <Text className="mb-1 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        Agree on a Time
      </Text>
      <Text className="mb-8 text-base text-neutral-600 dark:text-neutral-400">
        Sign in to create and manage scheduling polls.
      </Text>

      <Text className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">Email</Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        className="mb-4 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor="#9ca3af"
        value={email}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Email magic link sign-in"
        className="mb-6 items-center rounded-xl bg-[#FF6B5C] py-4 opacity-100 active:opacity-90 disabled:opacity-50"
        disabled={busy || email.trim().length === 0}
        onPress={() => void onMagicLink()}
      >
        <Text className="text-base font-semibold text-white">
          {busy ? 'Sending…' : 'Email me a magic link'}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          onPress={() => void onApple()}
          style={{ height: 48, width: '100%', opacity: busy ? 0.5 : 1 }}
        />
      ) : null}

      {notice != null ? (
        <Text className="mt-6 text-center text-sm text-neutral-700 dark:text-neutral-300">
          {notice}
        </Text>
      ) : null}
    </View>
  );
}
