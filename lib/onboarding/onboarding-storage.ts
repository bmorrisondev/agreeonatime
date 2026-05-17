import { zustandStorage } from '@/lib/storage/zustand-storage';

const INTRO_SEEN_KEY = 'onboarding.v1.completed';
const DRAFT_KEY = 'onboarding.v1.draft';

/** Serializable draft for `events:create` after the user authenticates. */
export interface OnboardingEventDraft {
  readonly title: string;
  readonly description: string;
  readonly slotStarts: readonly number[];
  readonly deadline: number;
  readonly allowInviteeProposals: boolean;
}

export function hasSeenOnboardingIntro(): boolean {
  const v = zustandStorage.getItem(INTRO_SEEN_KEY);
  return typeof v === 'string' && v === '1';
}

/** @deprecated Use {@link hasSeenOnboardingIntro} */
export function hasCompletedOnboarding(): boolean {
  return hasSeenOnboardingIntro();
}

export function markOnboardingIntroSeen(): void {
  zustandStorage.setItem(INTRO_SEEN_KEY, '1');
}

/** @deprecated Use {@link markOnboardingIntroSeen} */
export function setCompletedOnboarding(): void {
  markOnboardingIntroSeen();
}

export function getOnboardingDraftEvent(): OnboardingEventDraft | null {
  const raw = zustandStorage.getItem(DRAFT_KEY);
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isOnboardingDraft(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setOnboardingDraftEvent(draft: OnboardingEventDraft): void {
  zustandStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearOnboardingDraft(): void {
  zustandStorage.removeItem(DRAFT_KEY);
}

/** Clears intro + draft so the launch modal can be shown again (Settings). */
export function resetOnboardingForManualPreview(): void {
  zustandStorage.removeItem(INTRO_SEEN_KEY);
  zustandStorage.removeItem(DRAFT_KEY);
}

function isOnboardingDraft(value: unknown): value is OnboardingEventDraft {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  if (typeof o.title !== 'string' || typeof o.description !== 'string') {
    return false;
  }
  if (typeof o.deadline !== 'number' || typeof o.allowInviteeProposals !== 'boolean') {
    return false;
  }
  if (!Array.isArray(o.slotStarts) || o.slotStarts.length < 2) {
    return false;
  }
  for (const n of o.slotStarts) {
    if (typeof n !== 'number') {
      return false;
    }
  }
  return true;
}
