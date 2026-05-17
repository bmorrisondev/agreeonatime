import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useConvexAuth } from 'convex/react';

import { OnboardingFeaturesSheet } from '@/components/onboarding/onboarding-features-sheet';
import { useOnboardingTheme } from '@/components/onboarding/onboarding-theme';
import { isConvexConfigured } from '@/lib/convex/client';
import {
  hasSeenOnboardingIntro,
  markOnboardingIntroSeen,
} from '@/lib/onboarding/onboarding-storage';

function IndexWithConvexAuth(): ReactElement {
  const theme = useOnboardingTheme();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [showIntro, setShowIntro] = useState(() => !hasSeenOnboardingIntro());

  useEffect(() => {
    if (showIntro && !hasSeenOnboardingIntro()) {
      markOnboardingIntroSeen();
    }
  }, [showIntro]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.spinner} size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  if (showIntro) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <OnboardingFeaturesSheet
          visible
          onCreateEvent={() => {
            setShowIntro(false);
            router.push('/onboarding/create-event');
          }}
          onLogIn={() => {
            setShowIntro(false);
            router.replace('/sign-in');
          }}
        />
      </View>
    );
  }

  return <Redirect href="/sign-in" />;
}

export default function Index(): ReactElement {
  if (!isConvexConfigured()) {
    return <Redirect href="/(tabs)" />;
  }

  return <IndexWithConvexAuth />;
}
