import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useMutation } from 'convex/react';
import { router } from 'expo-router';

import { ONBOARDING_BG, ONBOARDING_MUTED } from '@/components/onboarding/onboarding-theme';
import {
  clearOnboardingDraft,
  getOnboardingDraftEvent,
} from '@/lib/onboarding/onboarding-storage';

const createEventMutation = makeFunctionReference<'mutation'>('events:create');

/**
 * After sign-up or sign-in, persists a guest-built onboarding draft via `events:create`.
 */
export function CompleteOnboardingDraft(): ReactElement {
  const createEvent = useMutation(createEventMutation);
  const saveStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (saveStarted.current) {
      return;
    }
    const draft = getOnboardingDraftEvent();
    if (draft == null) {
      router.replace('/(tabs)');
      return;
    }
    saveStarted.current = true;
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
        router.replace(`/event/${id}`);
      } catch (e: unknown) {
        saveStarted.current = false;
        console.error('CompleteOnboardingDraft: failed to create event', e);
        setError('Could not save your event. Please try again from the home screen.');
      }
    })();
  }, [createEvent]);

  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: ONBOARDING_BG }}>
      <ActivityIndicator color="#FF6B5C" size="large" />
      <Text className="mt-4 text-center text-base" style={{ color: ONBOARDING_MUTED }}>
        Saving your event…
      </Text>
      {error != null ? (
        <Text className="mt-3 text-center text-sm text-red-400">{error}</Text>
      ) : null}
    </View>
  );
}
