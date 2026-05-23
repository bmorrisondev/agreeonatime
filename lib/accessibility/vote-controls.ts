import { t } from '@/lib/i18n/t';

export function formatVotesForTimeLabel(timeLabel: string): string {
  return t('a11y_votes_for_time', { time: timeLabel });
}

export function formatVoteYesNoLabel(
  timeLabel: string,
  vote: 'yes' | 'no',
  selected: boolean,
): string {
  const base =
    vote === 'yes'
      ? t('a11y_vote_yes_for', { time: timeLabel })
      : t('a11y_vote_no_for', { time: timeLabel });
  return selected ? `${base}. ${t('a11y_selected')}` : base;
}

export function formatPickTimeSlotLabel(timeLabel: string, selected: boolean): string {
  const base = t('pick_time_select_slot_a11y', { time: timeLabel });
  return selected ? `${base}. ${t('a11y_selected')}` : base;
}
