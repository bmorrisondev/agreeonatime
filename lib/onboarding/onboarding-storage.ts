import { zustandStorage } from '@/lib/storage/zustand-storage';

const COMPLETED_KEY = 'onboarding.v1.completed';
const DRAFT_KEY = 'onboarding.v1.draft';

/** Serializable draft for `events:create` after the user authenticates from onboarding. */
export interface OnboardingEventDraft {
  readonly title: string;
  readonly description: string;
  readonly slotStarts: readonly number[];
  readonly deadline: number;
  readonly allowInviteeProposals: boolean;
}

export function hasCompletedOnboarding(): boolean {
  const v = zustandStorage.getItem(COMPLETED_KEY);
  return typeof v === 'string' && v === '1';
}

export function setCompletedOnboarding(): void {
  zustandStorage.setItem(COMPLETED_KEY, '1');
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

/** Clears any in-progress draft before a manual onboarding walkthrough from Settings. */
export function resetOnboardingForManualPreview(): void {
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
