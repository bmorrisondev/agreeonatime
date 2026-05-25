import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useMutation } from 'convex/react';

import { useSubscription } from '@/hooks/use-subscription';
import { t } from '@/lib/i18n/t';

const setDevProOverrideMutation = makeFunctionReference<'mutation'>('devProOverride:setDevProOverride');

export function DevProOverrideToggle(): ReactElement | null {
  const subscription = useSubscription();
  const setDevProOverride = useMutation(setDevProOverrideMutation);
  const [busy, setBusy] = useState(false);

  const onToggle = useCallback(
    (next: boolean) => {
      if (busy) {
        return;
      }
      setBusy(true);
      void (async () => {
        try {
          await setDevProOverride({ enabled: next });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : t('settings_dev_pro_override_error_body');
          Alert.alert(t('settings_dev_pro_override_error_title'), message);
        } finally {
          setBusy(false);
        }
      })();
    },
    [busy, setDevProOverride],
  );

  if (!subscription.devProOverrideAvailable) {
    return null;
  }

  const enabled = subscription.devProOverride || subscription.isPro;

  return (
    <View className="mb-2 flex-row items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-ds-lg py-ds-md dark:border-amber-800 dark:bg-amber-950/40">
      <View className="shrink flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {t('settings_dev_pro_override')}
        </Text>
        <Text className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
          {t('settings_dev_pro_override_subtitle')}
        </Text>
        {subscription.isPro && !subscription.devProOverride ? (
          <Text className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            {t('settings_dev_pro_override_real_sub')}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={t('settings_dev_pro_override_a11y')}
        disabled={busy || (subscription.isPro && !subscription.devProOverride)}
        onValueChange={onToggle}
        value={enabled}
      />
    </View>
  );
}
