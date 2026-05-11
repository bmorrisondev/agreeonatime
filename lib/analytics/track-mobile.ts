import { posthogClientRef } from '@/lib/analytics/posthog-ref';

/** Funnel helpers (DEV-397). Safe no-ops when PostHog is disabled or on web. */

export function trackEventCreated(props: {
  timeslotCount: number;
  hasDescription: boolean;
  allowInviteeProposals: boolean;
}): void {
  posthogClientRef.current?.capture('event_created', props);
}

export function trackEventShared(props: { event_id: string; share_method?: string }): void {
  posthogClientRef.current?.capture('event_shared', props);
}

export function trackProposalApproved(): void {
  posthogClientRef.current?.capture('proposal_approved', {});
}

export function trackProposalRejected(): void {
  posthogClientRef.current?.capture('proposal_rejected', {});
}

export function trackTimePicked(props: { was_auto_suggest_winner: boolean }): void {
  posthogClientRef.current?.capture('time_picked', props);
}
