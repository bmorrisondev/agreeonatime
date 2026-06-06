/** Shared validation and defaults for event creation (create-event screen + onboarding guided step). */

import { roundTimeMs } from '@/lib/events/time-rounding';

export const EVENT_MAX_SLOTS = 20;
export const EVENT_HOUR_MS = 60 * 60 * 1000;
export const EVENT_DAY_MS = 24 * EVENT_HOUR_MS;

export interface EventFormValidationInput {
  readonly title: string;
  readonly slotStarts: readonly number[];
  readonly deadline: number;
}

export function buildDefaultEventSlots(): { slotStarts: number[]; deadline: number } {
  const now = Date.now();
  const first = roundTimeMs(now + 2 * EVENT_DAY_MS + 18 * EVENT_HOUR_MS);
  const second = roundTimeMs(first + 2 * EVENT_HOUR_MS);
  const deadline = roundTimeMs(first - EVENT_HOUR_MS);
  return { slotStarts: [first, second], deadline };
}

/** Template flow (DEV-442): owner fills times and deadline from scratch. */
export function buildEmptyEventForm(): { slotStarts: number[]; deadline: number } {
  return { slotStarts: [], deadline: 0 };
}

export function validateEventForm(params: EventFormValidationInput): string | null {
  if (params.title.trim().length === 0) {
    return 'Title is required';
  }
  if (params.slotStarts.length < 2 || params.slotStarts.length > EVENT_MAX_SLOTS) {
    return `Add between 2 and ${String(EVENT_MAX_SLOTS)} proposed times`;
  }
  const now = Date.now();
  if (params.deadline <= 0) {
    return 'Set a voting deadline';
  }
  if (params.deadline <= now) {
    return 'Voting deadline must be in the future';
  }
  const latest = Math.max(...params.slotStarts);
  if (params.deadline >= latest) {
    return 'Deadline must be before the latest proposed time';
  }
  return null;
}
