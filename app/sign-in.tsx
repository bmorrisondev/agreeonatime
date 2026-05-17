import type { ReactElement } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { CompleteOnboardingDraft } from '@/components/onboarding/complete-onboarding-draft';
import { authClient, isAuthClientConfigured } from '@/lib/auth-client';
import { isConvexConfigured } from '@/lib/convex/client';
import { isAppleSignInEnabled } from '@/lib/env/is-apple-sign-in-enabled';
import { getOnboardingDraftEvent } from '@/lib/onboarding/onboarding-storage';

type AuthMode = 'forgot-password' | 'magic-link' | 'sign-in' | 'sign-up';

function initialAuthModeFromParams(modeParam: string | string[] | undefined): AuthMode {
  const raw = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  return raw === 'sign-up' ? 'sign-up' : 'sign-in';
}

export default function SignInScreen(): ReactElement {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string | string[] }>();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<AuthMode>(() => initialAuthModeFromParams(modeParam));
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
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
        <ActivityIndicator color="#FF6B5C" size="large" />
      </View>
    );
  }

  if (session?.user) {
    if (getOnboardingDraftEvent() != null) {
      return <CompleteOnboardingDraft />;
    }
    return <Redirect href="/(tabs)" />;
  }

  const callbackURL = Linking.createURL('/');

  const onPasswordSubmit = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'sign-up') {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split('@')[0],
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

  const onMagicLink = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
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

  const onRequestResetCode = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await authClient.emailOtp.requestPasswordReset({
        email: email.trim(),
      });
      if (result.error) {
        setNotice(result.error.message ?? 'Could not send reset code.');
      } else {
        setResetCodeSent(true);
        setNotice('Check your email for the 6-digit code.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onResetPassword = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        password: newPassword,
      });
      if (result.error) {
        setNotice(result.error.message ?? 'Password reset failed.');
      } else {
        setNotice('Password reset! You can now sign in.');
        setMode('sign-in');
        setOtp('');
        setNewPassword('');
        setResetCodeSent(false);
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

  const isPasswordMode = mode === 'sign-in' || mode === 'sign-up';
  const canSubmitPassword =
    isPasswordMode && email.trim().length > 0 && password.length >= 8;
  const hasOnboardingDraft = getOnboardingDraftEvent() != null;

  return (
    <View className="flex-1 justify-center bg-white px-6 dark:bg-black">
      <Text className="mb-1 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        Agree on a Time
      </Text>
      <Text className="mb-8 text-base text-neutral-600 dark:text-neutral-400">
        {mode === 'sign-up'
          ? hasOnboardingDraft
            ? 'Create an account to save your event.'
            : 'Create an account to get started.'
          : mode === 'forgot-password'
            ? 'Reset your password via a code sent to your email.'
            : hasOnboardingDraft
              ? 'Sign in to save your event.'
              : 'Sign in to create and manage scheduling polls.'}
      </Text>

      {mode === 'sign-up' && (
        <>
          <Text className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">Name</Text>
          <TextInput
            accessibilityLabel="Your name"
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            className="mb-4 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            onChangeText={setName}
            placeholder="Jane Doe"
            placeholderTextColor="#9ca3af"
            value={name}
          />
        </>
      )}

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

      {isPasswordMode && (
        <>
          <Text className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            autoCorrect={false}
            className="mb-2 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
          />
          {mode === 'sign-in' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
              className="mb-4 self-end"
              onPress={() => {
                setMode('forgot-password');
                setPassword('');
                setOtp('');
                setNewPassword('');
                setResetCodeSent(false);
                setNotice(null);
              }}
            >
              <Text className="text-sm font-medium text-[#FF6B5C]">Forgot password?</Text>
            </Pressable>
          )}
          {mode === 'sign-up' && <View className="mb-2" />}
        </>
      )}

      {mode === 'forgot-password' && !resetCodeSent && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send reset code"
          className="mb-3 items-center rounded-xl bg-[#FF6B5C] py-4 opacity-100 active:opacity-90 disabled:opacity-50"
          disabled={busy || email.trim().length === 0}
          onPress={() => void onRequestResetCode()}
        >
          <Text className="text-base font-semibold text-white">
            {busy ? 'Sending…' : 'Send reset code'}
          </Text>
        </Pressable>
      )}

      {mode === 'forgot-password' && resetCodeSent && (
        <>
          <Text className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">
            6-digit code
          </Text>
          <TextInput
            accessibilityLabel="6-digit reset code"
            autoCapitalize="none"
            autoComplete="one-time-code"
            autoCorrect={false}
            className="mb-4 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-2xl font-bold tracking-widest text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setOtp}
            placeholder="000000"
            placeholderTextColor="#9ca3af"
            value={otp}
          />

          <Text className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">
            New password
          </Text>
          <TextInput
            accessibilityLabel="New password"
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect={false}
            className="mb-4 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            onChangeText={setNewPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={newPassword}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset password"
            className="mb-3 items-center rounded-xl bg-[#FF6B5C] py-4 opacity-100 active:opacity-90 disabled:opacity-50"
            disabled={busy || otp.trim().length !== 6 || newPassword.length < 8}
            onPress={() => void onResetPassword()}
          >
            <Text className="text-base font-semibold text-white">
              {busy ? 'Resetting…' : 'Reset password'}
            </Text>
          </Pressable>
        </>
      )}

      {isPasswordMode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === 'sign-up' ? 'Create account' : 'Sign in with password'}
          className="mb-3 items-center rounded-xl bg-[#FF6B5C] py-4 opacity-100 active:opacity-90 disabled:opacity-50"
          disabled={busy || !canSubmitPassword}
          onPress={() => void onPasswordSubmit()}
        >
          <Text className="text-base font-semibold text-white">
            {busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
          </Text>
        </Pressable>
      ) : mode === 'magic-link' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Email magic link sign-in"
          className="mb-3 items-center rounded-xl bg-[#FF6B5C] py-4 opacity-100 active:opacity-90 disabled:opacity-50"
          disabled={busy || email.trim().length === 0}
          onPress={() => void onMagicLink()}
        >
          <Text className="text-base font-semibold text-white">
            {busy ? 'Sending…' : 'Email me a magic link'}
          </Text>
        </Pressable>
      ) : null}

      {/* Mode switchers */}
      <View className="mb-6 flex-row flex-wrap justify-center gap-4">
        {mode !== 'sign-in' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to sign in with password"
            onPress={() => {
              setMode('sign-in');
              setResetCodeSent(false);
              setOtp('');
              setNewPassword('');
              setNotice(null);
            }}
          >
            <Text className="text-sm font-medium text-[#FF6B5C]">
              {hasOnboardingDraft ? 'Already have an account? Sign in' : 'Sign in with password'}
            </Text>
          </Pressable>
        )}
        {mode !== 'sign-up' && mode !== 'forgot-password' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to create account"
            onPress={() => {
              setMode('sign-up');
              setNotice(null);
            }}
          >
            <Text className="text-sm font-medium text-[#FF6B5C]">Create account</Text>
          </Pressable>
        )}
        {mode !== 'magic-link' && mode !== 'forgot-password' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to magic link"
            onPress={() => {
              setMode('magic-link');
              setNotice(null);
            }}
          >
            <Text className="text-sm font-medium text-[#FF6B5C]">Use magic link</Text>
          </Pressable>
        )}
      </View>

      {isAppleSignInEnabled() && Platform.OS === 'ios' ? (
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
