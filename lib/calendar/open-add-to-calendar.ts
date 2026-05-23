import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

import { buildGoogleCalendarUrl } from '@/lib/calendar/build-google-calendar-url';
import { buildIcsCalendarEvent } from '@/lib/calendar/build-ics';
import type { CalendarEventInput } from '@/lib/calendar/calendar-event';

function sanitizeFileSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug.slice(0, 40) : 'event';
}

async function openIcsFileOnNative(input: CalendarEventInput, uid: string): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory;
  if (cacheDir == null) {
    throw new Error('Calendar file cache is unavailable');
  }
  const ics = buildIcsCalendarEvent(input, uid);
  const fileUri = `${cacheDir}agreeonatime-${sanitizeFileSlug(input.title)}.ics`;
  await FileSystem.writeAsStringAsync(fileUri, ics, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const canOpen = await Linking.canOpenURL(fileUri);
  if (!canOpen) {
    throw new Error('Cannot open calendar file on this device');
  }
  await Linking.openURL(fileUri);
}

function openGoogleCalendarOnWeb(input: CalendarEventInput): void {
  const url = buildGoogleCalendarUrl(input);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

/**
 * Option B: open native calendar UI with a pre-filled event (no calendar permission).
 * iOS/Android: write a temporary `.ics` and open it (Calendar import / add flow).
 * Web: Google Calendar template URL.
 */
export async function openAddToCalendar(
  input: CalendarEventInput,
  options?: { readonly uid?: string },
): Promise<void> {
  const uid = options?.uid ?? `agreeonatime-${input.startTimeMs}@agreeonatime.com`;

  if (Platform.OS === 'web') {
    openGoogleCalendarOnWeb(input);
    return;
  }

  try {
    await openIcsFileOnNative(input, uid);
  } catch {
    try {
      await Linking.openURL(buildGoogleCalendarUrl(input));
    } catch {
      Alert.alert(
        'Could not open calendar',
        'Try again on your device, or add the event manually in your calendar app.',
      );
    }
  }
}
