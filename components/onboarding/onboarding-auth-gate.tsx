import type { ReactElement } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { ONBOARDING_ACCENT, ONBOARDING_BG, ONBOARDING_MUTED } from '@/components/onboarding/onboarding-theme';
import { authClient, isAuthClientConfigured } from '@/lib/auth-client';
import { isConvexConfigured } from '@/lib/convex/client';

type AuthGateMode = 'choice' | 'sign-in' | 'sign-up';

export interface OnboardingAuthGateProps {
  readonly onBack?: () => void;
  readonly isPreview?: boolean;
  readonly onPreviewComplete?: () => void;
}

export function OnboardingAuthGate(props: OnboardingAuthGateProps): ReactElement {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<AuthGateMode>('choice');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isConvexConfigured() || !isAuthClientConfigured()) {
    return (
      <View className="flex-1 justify-center px-6" style={{ backgroundColor: ONBOARDING_BG }}>
        <Text className="text-lg text-white">Convex is not configured.</Text>
        <Text className="mt-2" style={{ color: ONBOARDING_MUTED }}>
          Add EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CONVEX_SITE_URL to continue.
        </Text>
      </View>
    );
  }

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: ONBOARDING_BG }}>
        <ActivityIndicator color={ONBOARDING_ACCENT} size="large" />
      </View>
    );
  }

  if (session?.user) {
    if (props.isPreview) {
      return (
        <View className="flex-1 justify-center px-6" style={{ backgroundColor: ONBOARDING_BG }}>
          <Text className="mb-2 text-center text-3xl font-bold text-white">Almost there!</Text>
          <Text className="mb-8 text-center text-base" style={{ color: ONBOARDING_MUTED }}>
            You are already signed in. This is the end of the onboarding preview.
          </Text>
          <Pressable
            accessibilityLabel="Finish onboarding preview"
            accessibilityRole="button"
            className="items-center rounded-2xl py-4"
            style={{ backgroundColor: ONBOARDING_ACCENT }}
            onPress={() => {
              props.onPreviewComplete?.();
            }}
          >
            <Text className="text-lg font-semibold text-white">Done</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: ONBOARDING_BG }}>
        <ActivityIndicator color={ONBOARDING_ACCENT} size="large" />
        <Text className="mt-4 text-center text-base" style={{ color: ONBOARDING_MUTED }}>
          Finishing sign in…
        </Text>
      </View>
    );
  }

  const onPasswordSubmit = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'sign-up') {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split('@')[0] || 'Guest',
        });
        if (result.error) {
          setNotice(result.error.message ?? 'Sign-up failed.');
        }
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (result.error) {
          setNotice(result.error.message ?? 'Sign-in failed.');
        }
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
        idToken: { token },
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

  const canSubmitPassword =
    (mode === 'sign-in' || mode === 'sign-up') && email.trim().length > 0 && password.length >= 8;

  return (
    <View className="flex-1 justify-center px-6" style={{ backgroundColor: ONBOARDING_BG }}>
      <Text className="mb-2 text-center text-3xl font-bold text-white">Almost there!</Text>
      <Text className="mb-8 text-center text-base" style={{ color: ONBOARDING_MUTED }}>
        Sign up to save your event, or log in if you already have an account.
      </Text>

      {mode === 'choice' ? (
        <>
          <Pressable
            accessibilityLabel="Sign up free"
            accessibilityRole="button"
            className="mb-4 items-center rounded-2xl py-4"
            style={{ backgroundColor: ONBOARDING_ACCENT }}
            onPress={() => {
              setMode('sign-up');
              setNotice(null);
            }}
          >
            <Text className="text-lg font-semibold text-white">Sign up free</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Log in"
            accessibilityRole="button"
            className="mb-6 items-center py-2"
            onPress={() => {
              setMode('sign-in');
              setNotice(null);
            }}
          >
            <Text className="text-base font-semibold" style={{ color: ONBOARDING_MUTED }}>
              Log in
            </Text>
          </Pressable>
        </>
      ) : null}

      {(mode === 'sign-in' || mode === 'sign-up') && (
        <>
          {mode === 'sign-up' && (
            <>
              <Text className="mb-2 font-medium" style={{ color: ONBOARDING_MUTED }}>
                Name
              </Text>
              <TextInput
                accessibilityLabel="Your name"
                autoCapitalize="words"
                autoComplete="name"
                className="mb-4 rounded-xl px-4 py-3 text-base text-white"
                onChangeText={setName}
                placeholder="Jane Doe"
                placeholderTextColor={ONBOARDING_MUTED}
                style={{ backgroundColor: '#252344', borderWidth: 1, borderColor: '#2E2C50' }}
                value={name}
              />
            </>
          )}
          <Text className="mb-2 font-medium" style={{ color: ONBOARDING_MUTED }}>
            Email
          </Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            className="mb-4 rounded-xl px-4 py-3 text-base text-white"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={ONBOARDING_MUTED}
            style={{ backgroundColor: '#252344', borderWidth: 1, borderColor: '#2E2C50' }}
            value={email}
          />
          <Text className="mb-2 font-medium" style={{ color: ONBOARDING_MUTED }}>
            Password
          </Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            className="mb-6 rounded-xl px-4 py-3 text-base text-white"
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor={ONBOARDING_MUTED}
            secureTextEntry
            style={{ backgroundColor: '#252344', borderWidth: 1, borderColor: '#2E2C50' }}
            value={password}
          />
          <Pressable
            accessibilityLabel={mode === 'sign-up' ? 'Submit sign up' : 'Submit sign in'}
            accessibilityRole="button"
            className="mb-4 items-center rounded-2xl py-4"
            disabled={busy || !canSubmitPassword}
            style={{ backgroundColor: ONBOARDING_ACCENT, opacity: busy || !canSubmitPassword ? 0.5 : 1 }}
            onPress={() => void onPasswordSubmit()}
          >
            <Text className="text-lg font-semibold text-white">
              {busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Back to sign up or log in choices"
            accessibilityRole="button"
            className="mb-4 items-center py-2"
            onPress={() => {
              setMode('choice');
              setNotice(null);
            }}
          >
            <Text className="text-sm font-medium" style={{ color: ONBOARDING_MUTED }}>
              Back
            </Text>
          </Pressable>
        </>
      )}

      {Platform.OS === 'ios' && mode !== 'choice' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          cornerRadius={12}
          onPress={() => void onApple()}
          style={{ height: 48, width: '100%', opacity: busy ? 0.5 : 1 }}
        />
      ) : null}

      {notice != null ? (
        <Text className="mt-4 text-center text-sm text-red-400">{notice}</Text>
      ) : null}
    </View>
  );
}
