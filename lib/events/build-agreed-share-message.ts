import { formatAgreedCardTime } from '@/lib/events/format-agreed-card-time';

export function buildAgreedShareMessage(title: string, decidedStartTimeMs: number): string {
  const when = formatAgreedCardTime(decidedStartTimeMs);
  return `We're meeting for “${title}” — ${when}\n\nAgreed with Agree on a Time`;
}
