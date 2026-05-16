import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useConvexAuth, useMutation } from 'convex/react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingAuthGate } from '@/components/onboarding/onboarding-auth-gate';
import { OnboardingGuidedEvent } from '@/components/onboarding/onboarding-guided-event';
import { OnboardingValuePager } from '@/components/onboarding/onboarding-value-pager';
import { ONBOARDING_BG } from '@/components/onboarding/onboarding-theme';
import { isConvexConfigured } from '@/lib/convex/client';
import {
  clearOnboardingDraft,
  getOnboardingDraftEvent,
  hasCompletedOnboarding,
  type OnboardingEventDraft,
  setCompletedOnboarding,
  setOnboardingDraftEvent,
} from '@/lib/onboarding/onboarding-storage';

const createEventMutation = makeFunctionReference<'mutation'>('events:create');

type Phase = 'auth' | 'guided' | 'value';

function readInitialPhase(): Phase {
  return getOnboardingDraftEvent() != null ? 'auth' : 'value';
}

export default function OnboardingScreen(): ReactElement {
  if (!isConvexConfigured()) {
    return <Redirect href="/(tabs)" />;
  }
  return <OnboardingScreenInner />;
}

function isOnboardingPreviewParam(preview: string | string[] | undefined): boolean {
  const value = Array.isArray(preview) ? preview[0] : preview;
  return value === '1' || value === 'true';
}

function OnboardingScreenInner(): ReactElement {
  const insets = useSafeAreaInsets();
  const { preview } = useLocalSearchParams<{ preview?: string | string[] }>();
  const isPreview = isOnboardingPreviewParam(preview);
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const createEvent = useMutation(createEventMutation);
  const [phase, setPhase] = useState<Phase>(() => (isPreview ? 'value' : readInitialPhase()));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flushKey, setFlushKey] = useState(0);
  const draftSaveStarted = useRef(false);

  const finishPreview = useCallback((): void => {
    clearOnboardingDraft();
    setCompletedOnboarding();
    router.replace('/(tabs)/settings');
  }, []);

  const exitToSignIn = useCallback((): void => {
    if (isPreview) {
      finishPreview();
      return;
    }
    setCompletedOnboarding();
    clearOnboardingDraft();
    router.replace('/sign-in');
  }, [finishPreview, isPreview]);

  const onSkipFromValue = useCallback((): void => {
    if (isPreview) {
      finishPreview();
      return;
    }
    setCompletedOnboarding();
    router.replace('/sign-in');
  }, [finishPreview, isPreview]);

  const onTryItOut = useCallback((): void => {
    setPhase('guided');
  }, []);

  const onGuidedBack = useCallback((): void => {
    exitToSignIn();
  }, [exitToSignIn]);

  const onSaveDraft = useCallback((draft: OnboardingEventDraft): void => {
    setOnboardingDraftEvent(draft);
    setSaveError(null);
    setPhase('auth');
  }, []);

  const onRetrySave = useCallback((): void => {
    draftSaveStarted.current = false;
    setSaveError(null);
    setFlushKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (phase !== 'guided') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitToSignIn();
      return true;
    });
    return () => sub.remove();
  }, [exitToSignIn, phase]);

  useEffect(() => {
    if (!isAuthenticated) {
      draftSaveStarted.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (phase !== 'auth') {
      return;
    }
    if (convexAuthLoading || !isAuthenticated) {
      return;
    }
    if (draftSaveStarted.current) {
      return;
    }
    const draft = getOnboardingDraftEvent();
    if (draft == null) {
      if (isPreview) {
        return;
      }
      setCompletedOnboarding();
      router.replace('/(tabs)');
      return;
    }
    draftSaveStarted.current = true;
    void (async () => {
      try {
        const desc = draft.description.trim();
        const id = await createEvent({
          title: draft.title.trim(),
          description: desc.length > 0 ? desc : undefined,
          timeslotStarts: [...draft.slotStarts],
          deadline: draft.deadline,
          allowInviteeProposals: draft.allowInviteeProposals,
        });
        clearOnboardingDraft();
        setCompletedOnboarding();
        router.replace(`/event/${id}`);
      } catch (e: unknown) {
        draftSaveStarted.current = true;
        console.error('Onboarding: failed to create event after auth', e);
        setSaveError('Could not save your event. Please try again.');
      }
    })();
  }, [convexAuthLoading, createEvent, flushKey, isAuthenticated, isPreview, phase]);

  if (
    !isPreview &&
    !convexAuthLoading &&
    isAuthenticated &&
    getOnboardingDraftEvent() == null
  ) {
    return <Redirect href="/(tabs)" />;
  }

  if (!isPreview && !convexAuthLoading && !isAuthenticated && hasCompletedOnboarding()) {
    if (getOnboardingDraftEvent() != null) {
      clearOnboardingDraft();
    }
    return <Redirect href="/sign-in" />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: ONBOARDING_BG }}>
      {phase === 'value' ? <OnboardingValuePager onSkip={onSkipFromValue} onTryItOut={onTryItOut} /> : null}
      {phase === 'guided' ? <OnboardingGuidedEvent onBack={onGuidedBack} onSaveDraft={onSaveDraft} /> : null}
      {phase === 'auth' ? (
        <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {saveError != null ? (
            <View className="mb-3 px-6">
              <Text className="mb-2 text-center text-sm text-red-400">{saveError}</Text>
              <Pressable
                accessibilityLabel="Retry saving your event"
                accessibilityRole="button"
                className="items-center rounded-xl py-3"
                style={{ borderWidth: 1, borderColor: '#FF6B5C' }}
                onPress={onRetrySave}
              >
                <Text className="font-semibold text-[#FF6B5C]">Try again</Text>
              </Pressable>
            </View>
          ) : null}
          <OnboardingAuthGate isPreview={isPreview} onPreviewComplete={finishPreview} />
        </View>
      ) : null}
    </View>
  );
}
