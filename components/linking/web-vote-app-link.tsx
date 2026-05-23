import type { ReactElement } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Head from 'expo-router/head';

import { APP_STORE_APP_ID } from '@/lib/constants/native-app-linking';
import { isIosSafari } from '@/lib/linking/is-ios-safari';
import { buildVoteAppArgument, openVoteInInstalledApp } from '@/lib/linking/open-vote-in-app';
import { t } from '@/lib/i18n/t';

export interface WebVoteAppLinkProps {
  readonly shareToken: string;
}

/**
 * Web-only: Smart App Banner meta + optional “Open in app” row for iOS Safari.
 */
export function WebVoteAppLink({ shareToken }: WebVoteAppLinkProps): ReactElement | null {
  if (Platform.OS !== 'web' || shareToken.length < 8) {
    return null;
  }

  const appArgument = buildVoteAppArgument(shareToken);
  const showOpenRow = isIosSafari();

  return (
    <>
      <Head>
        <meta
          name="apple-itunes-app"
          content={`app-id=${APP_STORE_APP_ID}, app-argument=${appArgument}`}
        />
      </Head>
      {showOpenRow ? (
        <View className="mb-4 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 dark:border-brand/40 dark:bg-brand/15">
          <Text className="text-sm text-neutral-800 dark:text-neutral-200">{t('vote_open_in_app_hint')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('vote_open_in_app_a11y')}
            className="mt-3 items-center rounded-lg bg-brand py-2.5 active:opacity-90"
            onPress={() => {
              openVoteInInstalledApp(shareToken);
            }}
          >
            <Text className="text-sm font-semibold text-white">{t('vote_open_in_app')}</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}
