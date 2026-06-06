import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';

import { CalendarIosDownloadCta } from '@/components/calendar/calendar-ios-download-cta';
import { CheckCalendarSection } from '@/components/calendar/check-calendar-section';
import { AiTimeSuggestions } from '@/components/events/ai-time-suggestions';
import type { CalendarConflictStatus } from '@/hooks/use-calendar-conflicts';

export interface ProposedTimesHelpersProps {
  readonly ai: {
    readonly deadlineMs: number;
    readonly disabled: boolean;
    readonly existingSlotMs: readonly number[];
    readonly isLoaded: boolean;
    readonly isPro: boolean;
    readonly slotCount: number;
    readonly onAddSlot: (startTimeMs: number) => void;
    readonly onOpenPaywall: () => void;
  };
  readonly calendar: {
    readonly disabled: boolean;
    readonly errorMessage: string | null;
    readonly status: CalendarConflictStatus;
    readonly onPressCheck: () => void;
  };
}

/** Agree+ helpers for the proposed-times section — compact chip row above slot inputs. */
export function ProposedTimesHelpers(props: ProposedTimesHelpersProps): ReactElement {
  const { ai, calendar } = props;

  return (
    <View className="mb-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <AiTimeSuggestions
          deadlineMs={ai.deadlineMs}
          disabled={ai.disabled}
          existingSlotMs={ai.existingSlotMs}
          isLoaded={ai.isLoaded}
          isPro={ai.isPro}
          slotCount={ai.slotCount}
          layout="chip"
          onAddSlot={ai.onAddSlot}
          onOpenPaywall={ai.onOpenPaywall}
        />
        {Platform.OS === 'web' ? (
          <CalendarIosDownloadCta layout="chip" />
        ) : (
          <CheckCalendarSection
            disabled={calendar.disabled}
            errorMessage={calendar.errorMessage}
            layout="chip"
            status={calendar.status}
            onPressCheck={calendar.onPressCheck}
          />
        )}
      </View>
    </View>
  );
}
