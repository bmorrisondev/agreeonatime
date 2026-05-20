import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useMutation } from 'convex/react';
import { router } from 'expo-router';

import { PaywallModal } from '@/components/purchases/paywall-modal';
import { useOnboardingTheme } from '@/components/onboarding/onboarding-theme';
import { useSubscription } from '@/hooks/use-subscription';
import { formatMutationError } from '@/lib/convex/format-mutation-error';
import {
  clearOnboardingDraft,
  getOnboardingDraftEvent,
} from '@/lib/onboarding/onboarding-storage';

const createEventMutation = makeFunctionReference<'mutation'>('events:create');

/**
 * After sign-up or sign-in, persists a guest-built onboarding draft via `events:create`.
 */
export function CompleteOnboardingDraft(): ReactElement {
  const theme = useOnboardingTheme();
  const createEvent = useMutation(createEventMutation);
  const subscription = useSubscription();
  const saveStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (saveStarted.current || !subscription.isLoaded) {
      return;
    }
    const draft = getOnboardingDraftEvent();
    if (draft == null) {
      router.replace('/(tabs)');
      return;
    }
    if (!subscription.canCreateMore) {
      setPaywallVisible(true);
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
        const message = formatMutationError(e, 'Could not save your event.');
        setError(message);
        if (message.includes('one active event')) {
          setPaywallVisible(true);
        }
      }
    })();
  }, [createEvent, retryToken, subscription.canCreateMore, subscription.isLoaded]);

  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.background }}>
      <ActivityIndicator color={theme.accent} size="large" />
      <Text className="mt-4 text-center text-base" style={{ color: theme.muted }}>
        Saving your event…
      </Text>
      {error != null ? (
        <Text className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</Text>
      ) : null}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => {
          setPaywallVisible(false);
          router.replace('/(tabs)');
        }}
        onSubscribed={() => {
          saveStarted.current = false;
          setRetryToken((n) => n + 1);
        }}
      />
    </View>
  );
}
