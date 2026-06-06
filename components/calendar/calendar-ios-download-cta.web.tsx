import type { ReactElement } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { APP_STORE_APP_ID } from '@/lib/constants/native-app-linking';
import { t } from '@/lib/i18n/t';

const APP_STORE_URL = `https://apps.apple.com/app/agree-on-a-time/id${APP_STORE_APP_ID}`;

/** Web-only: promote iOS app for Apple Calendar conflict checks (Agree+). */
export function CalendarIosDownloadCta(): ReactElement {
  return (
    <View className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/50">
      <Text className="text-sm text-neutral-700 dark:text-neutral-300">
        {t('create_event_calendar_ios_hint')}
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('create_event_calendar_ios_cta_a11y')}
        className="mt-3 self-start rounded-lg bg-brand px-4 py-2.5 active:opacity-90"
        onPress={() => {
          void Linking.openURL(APP_STORE_URL);
        }}
      >
        <Text className="text-sm font-semibold text-white">{t('create_event_calendar_ios_cta')}</Text>
      </Pressable>
    </View>
  );
}
