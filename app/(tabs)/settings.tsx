import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { makeFunctionReference } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevProOverrideToggle } from '@/components/dev/dev-pro-override-toggle';
import { DsButton } from '@/components/design-system/button';
import { DsListItem } from '@/components/design-system/list-item';
import { DsModal } from '@/components/design-system/modal-sheet';
import { SubscriptionSettingsSection } from '@/components/purchases/subscription-settings-section';
import { OnboardingFeaturesSheet } from '@/components/onboarding/onboarding-features-sheet';
import { TabMainHeader } from '@/components/navigation/tab-main-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { authClient } from '@/lib/auth-client';
import { isDevToolsEnabled } from '@/lib/env/is-dev-tools-enabled';
import { t } from '@/lib/i18n/t';
import { resetOnboardingForManualPreview } from '@/lib/onboarding/onboarding-storage';

const getCurrentUserQuery = makeFunctionReference<'query'>('users:getCurrentUser');
const deleteAccountMutation = makeFunctionReference<'mutation'>('users:deleteAccount');
const sendTestReminderEmailMutation = makeFunctionReference<'mutation'>(
  'reminderEmails:sendTestReminderEmail',
);

const MARKETING_BASE = 'https://agreeonatime.com';
const FEATUREBASE_URL = 'https://agreeonatime.featurebase.app';

function openExternal(url: string): void {
  if (Platform.OS === 'web') {
    Linking.openURL(url);
  } else {
    void openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  }
}

const chevron = (
  <IconSymbol name="chevron.right" size={16} color="#A3A3A3" />
);

export default function SettingsTabScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const user = useQuery(getCurrentUserQuery);
  const deleteAccount = useMutation(deleteAccountMutation);
  const sendTestReminderEmail = useMutation(sendTestReminderEmailMutation);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [onboardingSheetVisible, setOnboardingSheetVisible] = useState(false);
  const [sendingTestReminder, setSendingTestReminder] = useState(false);
  const showDevTools = isDevToolsEnabled();

  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '1';

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    router.replace('/sign-in');
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await authClient.signOut();
      setDeleteModalVisible(false);
      router.replace('/sign-in');
    } catch {
      setDeleteError(t('settings_delete_error'));
    } finally {
      setDeleting(false);
    }
  }, [deleteAccount]);

  const handlePreviewOnboardingSheet = useCallback(() => {
    setOnboardingSheetVisible(true);
  }, []);

  const handleSheetCreateEvent = useCallback(() => {
    setOnboardingSheetVisible(false);
    router.push('/onboarding/create-event');
  }, []);

  const handleSheetLogIn = useCallback(() => {
    setOnboardingSheetVisible(false);
    router.push('/sign-in');
  }, []);

  const handleSendTestReminderEmail = useCallback(async () => {
    if (user == null) {
      Alert.alert(t('settings_test_reminder_sign_in_title'), t('settings_test_reminder_sign_in_body'));
      return;
    }
    setSendingTestReminder(true);
    try {
      const result = await sendTestReminderEmail({ kind: '24h' });
      Alert.alert(
        t('settings_test_reminder_sent_title'),
        t('settings_test_reminder_sent_body', {
          email: result.toEmail,
          event: result.eventTitle,
        }),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t('settings_test_reminder_error_body');
      Alert.alert(t('settings_test_reminder_error_title'), message);
    } finally {
      setSendingTestReminder(false);
    }
  }, [sendTestReminderEmail, user]);

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <TabMainHeader title={t('settings_title')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
      {/* Account */}
      <SectionHeader text={t('settings_account_header')} />

      {user === undefined ? (
        <View className="items-center py-ds-lg">
          <ActivityIndicator />
        </View>
      ) : user != null ? (
        <View className="px-ds-lg">
          <DsListItem
            title={user.name || user.email}
            subtitle={user.name ? user.email : undefined}
            accessibilityLabel={`Account: ${user.name || user.email}`}
          />
        </View>
      ) : null}

      <View className="px-ds-lg">
        <DsListItem
          title={t('settings_signOut')}
          accessibilityLabel={t('settings_signOut_a11y')}
          onPress={() => void handleSignOut()}
        />
        <DsListItem
          title={t('settings_deleteAccount')}
          accessibilityLabel={t('settings_deleteAccount_a11y')}
          onPress={() => setDeleteModalVisible(true)}
        />
      </View>

      <SubscriptionSettingsSection />

      {/* Legal */}
      <SectionHeader text={t('settings_legal_header')} />
      <View className="px-ds-lg">
        <DsListItem
          title={t('settings_terms')}
          rightAccessory={chevron}
          accessibilityLabel={t('settings_terms')}
          onPress={() => openExternal(`${MARKETING_BASE}/terms`)}
        />
        <DsListItem
          title={t('settings_privacy')}
          rightAccessory={chevron}
          accessibilityLabel={t('settings_privacy')}
          onPress={() => openExternal(`${MARKETING_BASE}/privacy`)}
        />
      </View>

      {/* Support */}
      <SectionHeader text={t('settings_support_header')} />
      <View className="px-ds-lg">
        <DsListItem
          title={t('settings_support_feedback')}
          subtitle={t('settings_support_feedback_subtitle')}
          rightAccessory={chevron}
          accessibilityLabel={t('settings_support_feedback')}
          onPress={() => openExternal(FEATUREBASE_URL)}
        />
      </View>

      {showDevTools ? (
        <>
          <SectionHeader text={t('settings_developer_header')} />
          <View className="px-ds-lg">
            <DevProOverrideToggle />
            <DsListItem
              title={t('settings_design_system')}
              subtitle={t('settings_design_system_subtitle')}
              rightAccessory={chevron}
              accessibilityLabel={t('settings_design_system')}
              onPress={() => router.push('/design-system')}
            />
            <DsListItem
              title={t('settings_onboarding_sheet')}
              subtitle={t('settings_onboarding_sheet_subtitle')}
              rightAccessory={chevron}
              accessibilityLabel={t('settings_onboarding_sheet_a11y')}
              onPress={handlePreviewOnboardingSheet}
            />
            <DsListItem
              title={t('settings_reset_onboarding')}
              subtitle={t('settings_reset_onboarding_subtitle')}
              accessibilityLabel={t('settings_reset_onboarding_a11y')}
              onPress={() => {
                resetOnboardingForManualPreview();
              }}
            />
            <DsListItem
              title={t('settings_test_reminder_email')}
              subtitle={t('settings_test_reminder_email_subtitle')}
              accessibilityLabel={t('settings_test_reminder_email_a11y')}
              rightAccessory={
                sendingTestReminder ? <ActivityIndicator accessibilityLabel={t('a11y_loading')} /> : undefined
              }
              onPress={() => {
                if (!sendingTestReminder) {
                  void handleSendTestReminderEmail();
                }
              }}
            />
          </View>

          <OnboardingFeaturesSheet
            visible={onboardingSheetVisible}
            onCreateEvent={handleSheetCreateEvent}
            onLogIn={handleSheetLogIn}
          />
        </>
      ) : null}

      {/* Version */}
      <View className="mt-ds-2xl items-center px-ds-lg">
        <Text
          allowFontScaling
          accessibilityLabel={`App version ${version}, build ${build}`}
          className="text-caption text-neutral-400 dark:text-neutral-600"
          maxFontSizeMultiplier={2}
        >
          {t('settings_version', { version, build })}
        </Text>
      </View>

      <DsModal
        visible={deleteModalVisible}
        title={t('settings_delete_modal_title')}
        onClose={() => {
          if (!deleting) {
            setDeleteModalVisible(false);
            setDeleteError(null);
          }
        }}
      >
        <Text
          allowFontScaling
          className="mb-ds-lg text-body text-neutral-700 dark:text-neutral-300"
          maxFontSizeMultiplier={2}
        >
          {t('settings_delete_modal_body')}
        </Text>

        {deleteError != null ? (
          <Text
            allowFontScaling
            accessibilityLiveRegion="polite"
            className="mb-ds-md text-caption text-danger"
            accessibilityRole="alert"
            maxFontSizeMultiplier={2}
          >
            {deleteError}
          </Text>
        ) : null}

        <DsButton
          variant="destructive"
          accessibilityLabel={t('settings_delete_modal_confirm')}
          disabled={deleting}
          onPress={() => void handleDeleteConfirm()}
        >
          {deleting ? 'Deleting…' : t('settings_delete_modal_confirm')}
        </DsButton>
        <View className="mt-ds-sm">
          <DsButton
            variant="secondary"
            accessibilityLabel={t('settings_delete_modal_cancel')}
            disabled={deleting}
            onPress={() => {
              setDeleteModalVisible(false);
              setDeleteError(null);
            }}
          >
            {t('settings_delete_modal_cancel')}
          </DsButton>
        </View>
      </DsModal>
    </ScrollView>
    </View>
  );
}

function SectionHeader({ text }: { text: string }): ReactElement {
  return (
    <View className="bg-neutral-100 px-ds-lg py-ds-sm dark:bg-neutral-900">
      <Text
        allowFontScaling
        accessibilityRole="header"
        className="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400"
        maxFontSizeMultiplier={2}
      >
        {text}
      </Text>
    </View>
  );
}
