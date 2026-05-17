import type { ReactElement } from 'react';
import { Redirect, router } from 'expo-router';

import { OnboardingGuidedEvent } from '@/components/onboarding/onboarding-guided-event';
import { isConvexConfigured } from '@/lib/convex/client';
import {
  markOnboardingIntroSeen,
  setOnboardingDraftEvent,
  type OnboardingEventDraft,
} from '@/lib/onboarding/onboarding-storage';

export default function OnboardingCreateEventScreen(): ReactElement {
  if (!isConvexConfigured()) {
    return <Redirect href="/sign-in" />;
  }

  const onSaveDraft = (draft: OnboardingEventDraft): void => {
    setOnboardingDraftEvent(draft);
    markOnboardingIntroSeen();
    router.replace('/sign-in');
  };

  return (
    <OnboardingGuidedEvent
      onBack={() => {
        markOnboardingIntroSeen();
        router.replace('/sign-in');
      }}
      onSaveDraft={onSaveDraft}
    />
  );
}
