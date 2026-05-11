import type { ReactElement } from 'react';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';

import {
  DsAvatarStack,
  DsButton,
  DsCard,
  DsDateTimeField,
  DsEmptyState,
  DsListItem,
  DsModal,
  DsTextField,
  DsToast,
  DsVoteBar,
} from '@/components/design-system';
import { t } from '@/lib/i18n/t';

export default function DesignSystemScreen(): ReactElement {
  const [email, setEmail] = useState('');
  const [when, setWhen] = useState(() => new Date());
  const [toastOpen, setToastOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const emailError = email.includes('@') || email.length === 0 ? undefined : t('ds_preview_emailError');

  return (
    <View className="relative flex-1 bg-white dark:bg-black">
      <Stack.Screen options={{ title: t('ds_designSystem_title') }} />
      <ScrollView contentContainerClassName="gap-ds-xl p-ds-lg pb-ds-2xl">
        <Text allowFontScaling className="text-body text-neutral-600 dark:text-neutral-400" maxFontSizeMultiplier={2}>
          {t('ds_designSystem_intro')}
        </Text>

        <DsCard>
          <Text allowFontScaling className="mb-ds-md text-heading font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            {t('ds_preview_buttons')}
          </Text>
          <View className="gap-ds-md">
            <DsButton variant="primary" onPress={() => setToastOpen(true)}>
              {t('ds_preview_showToast')}
            </DsButton>
            <DsButton variant="secondary" onPress={() => setModalOpen(true)}>
              {t('ds_preview_openModal')}
            </DsButton>
            <DsButton variant="destructive" disabled>
              {t('ds_common_cancel')}
            </DsButton>
          </View>
        </DsCard>

        <DsCard>
          <Text allowFontScaling className="mb-ds-md text-heading font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            {t('ds_preview_fields')}
          </Text>
          <View className="gap-ds-lg">
            <DsTextField
              autoCapitalize="none"
              keyboardType="email-address"
              label={t('ds_preview_emailLabel')}
              value={email}
              error={emailError}
              onChangeText={setEmail}
            />
            <DsDateTimeField label={t('ds_preview_eventTitle')} mode="datetime" value={when} onChange={setWhen} />
          </View>
        </DsCard>

        <DsCard>
          <Text allowFontScaling className="mb-ds-md text-heading font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            {t('ds_preview_feedback')}
          </Text>
          <DsEmptyState
            actionLabel={t('ds_emptyState_action')}
            description={t('ds_emptyState_body')}
            title={t('ds_emptyState_title')}
            onActionPress={() => undefined}
          />
        </DsCard>

        <DsCard>
          <Text allowFontScaling className="mb-ds-md text-heading font-semibold text-neutral-900 dark:text-neutral-100" maxFontSizeMultiplier={2}>
            {t('ds_preview_lists')}
          </Text>
          <DsListItem subtitle={t('ds_preview_listRow1Subtitle')} title={t('ds_preview_listRow1Title')} onPress={() => undefined} />
          <DsListItem subtitle={t('ds_preview_listRow2Subtitle')} title={t('ds_preview_listRow2Title')} onPress={() => undefined} />
          <View className="mt-ds-lg">
            <DsVoteBar noCount={2} yesCount={5} />
          </View>
          <View className="mt-ds-lg">
            <DsVoteBar noCount={0} yesCount={0} />
          </View>
          <View className="mt-ds-lg flex-row items-center gap-ds-md">
            <DsAvatarStack names={['Alex Kim', 'Sam Jones', 'Taylor Lee', 'Jamie Rivera', 'Casey Ng']} />
          </View>
        </DsCard>
      </ScrollView>

      <DsToast message={t('ds_preview_toastMessage')} visible={toastOpen} onDismiss={() => setToastOpen(false)} />
      <DsModal title={t('ds_preview_modalTitle')} visible={modalOpen} onClose={() => setModalOpen(false)}>
        <Text allowFontScaling className="text-body text-neutral-700 dark:text-neutral-300" maxFontSizeMultiplier={2}>
          {t('ds_preview_modalBody')}
        </Text>
        <View className="mt-ds-lg">
          <DsButton variant="primary" onPress={() => setModalOpen(false)}>
            {t('ds_common_ok')}
          </DsButton>
        </View>
      </DsModal>
    </View>
  );
}
