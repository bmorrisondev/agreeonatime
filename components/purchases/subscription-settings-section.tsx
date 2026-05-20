import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useAction } from 'convex/react';

import { DsListItem } from '@/components/design-system/list-item';
import { PaywallModal } from '@/components/purchases/paywall-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useSubscription } from '@/hooks/use-subscription';
import { authClient } from '@/lib/auth-client';
import { t } from '@/lib/i18n/t';
import { getProEntitlement, isProFromCustomerInfo } from '@/lib/purchases/customer-info';
import {
  getCustomerInfo,
  identifyUser,
  isPurchasesConfigured,
  restorePurchases,
  supportsPurchasesPlatform,
} from '@/lib/purchases';
import {
  canOpenSubscriptionManagement,
  getProPeriodLabel,
  openSubscriptionManagement,
} from '@/lib/purchases/subscription-management';

const syncFromRevenueCatAction = makeFunctionReference<'action'>('subscriptions:syncFromRevenueCat');

const chevron = (
  <IconSymbol name="chevron.right" size={16} color="#A3A3A3" />
);

export function SubscriptionSettingsSection(): ReactElement {
  const subscription = useSubscription();
  const { refresh } = useEntitlement();
  const sync = useAction(syncFromRevenueCatAction);
  const session = authClient.useSession();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renewalHint, setRenewalHint] = useState<string | null>(null);
  const [showManageBilling, setShowManageBilling] = useState(false);

  const purchasesAvailable = supportsPurchasesPlatform() && isPurchasesConfigured();

  useEffect(() => {
    if (!subscription.isPro || !purchasesAvailable) {
      setRenewalHint(null);
      setShowManageBilling(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const [info, canManage] = await Promise.all([
        getCustomerInfo(),
        canOpenSubscriptionManagement(),
      ]);
      if (cancelled) {
        return;
      }

      const ent = info != null ? getProEntitlement(info) : null;
      const period = ent != null ? getProPeriodLabel(ent) : null;
      if (period?.kind === 'renews') {
        setRenewalHint(t('settings_subscription_renews', { date: period.date }));
      } else if (period?.kind === 'expires') {
        setRenewalHint(t('settings_subscription_expires', { date: period.date }));
      } else {
        setRenewalHint(null);
      }
      setShowManageBilling(canManage);
    })();

    return () => {
      cancelled = true;
    };
  }, [purchasesAvailable, subscription.isPro]);

  const finishSync = useCallback(async () => {
    await refresh();
    try {
      await sync();
    } catch {
      // Convex sync retries on next app open.
    }
  }, [refresh, sync]);

  const runRestore = useCallback(async () => {
    if (!purchasesAvailable) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const userId = session.data?.user?.id;
      if (userId != null) {
        await identifyUser(userId);
      }
      const info = await restorePurchases();
      if (info != null && isProFromCustomerInfo(info)) {
        await finishSync();
      } else {
        setError(t('paywall_restore_none'));
      }
    } catch {
      setError(t('paywall_restore_error'));
    } finally {
      setBusy(false);
    }
  }, [finishSync, purchasesAvailable, session.data?.user?.id]);

  const runManageBilling = useCallback(async () => {
    if (!purchasesAvailable) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const opened = await openSubscriptionManagement();
      if (!opened) {
        setError(t('settings_subscription_manage_unavailable'));
        return;
      }
      await finishSync();
    } catch {
      setError(t('settings_subscription_manage_error'));
    } finally {
      setBusy(false);
    }
  }, [finishSync, purchasesAvailable]);

  const usageSubtitle = ((): string => {
    const count = subscription.activeOpenCount;
    if (subscription.isPro || subscription.maxActiveEvents == null) {
      return t('settings_subscription_usage_pro', { count });
    }
    return t('settings_subscription_usage_free', {
      count,
      max: subscription.maxActiveEvents,
    });
  })();

  const freePlanSubtitle = [t('settings_subscription_free_subtitle'), usageSubtitle].join('\n');

  return (
    <>
      <View className="bg-neutral-100 px-ds-lg py-ds-sm dark:bg-neutral-900">
        <Text
          allowFontScaling
          accessibilityRole="header"
          className="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400"
          maxFontSizeMultiplier={2}
        >
          {t('settings_subscription_header')}
        </Text>
      </View>

      {!subscription.isLoaded ? (
        <View className="items-center py-ds-lg">
          <ActivityIndicator accessibilityLabel={t('settings_subscription_loading_a11y')} />
        </View>
      ) : (
        <View className="px-ds-lg">
          <View className="border-b border-neutral-200 py-ds-md dark:border-neutral-700">
            {subscription.isPro ? (
              <>
                <View
                  accessibilityRole="text"
                  accessibilityLabel={t('settings_subscription_agree_plus_active_a11y')}
                  className="self-start rounded-ds-pill bg-brand/15 px-ds-md py-ds-xs"
                >
                  <Text
                    allowFontScaling
                    className="text-caption font-semibold text-brand"
                    maxFontSizeMultiplier={2}
                  >
                    {t('settings_subscription_agree_plus_active')}
                  </Text>
                </View>
                {renewalHint != null ? (
                  <Text
                    allowFontScaling
                    className="mt-ds-sm text-caption text-neutral-600 dark:text-neutral-400"
                    maxFontSizeMultiplier={2}
                  >
                    {renewalHint}
                  </Text>
                ) : null}
                <Text
                  allowFontScaling
                  className="mt-ds-xs text-caption text-neutral-600 dark:text-neutral-400"
                  maxFontSizeMultiplier={2}
                >
                  {[t('settings_subscription_pro_subtitle'), usageSubtitle].join('\n')}
                </Text>
              </>
            ) : (
              <>
                <Text
                  allowFontScaling
                  className="text-body font-medium text-neutral-900 dark:text-neutral-100"
                  maxFontSizeMultiplier={2}
                >
                  {t('settings_subscription_free')}
                </Text>
                <Text
                  allowFontScaling
                  className="mt-ds-xs text-caption text-neutral-600 dark:text-neutral-400"
                  maxFontSizeMultiplier={2}
                >
                  {freePlanSubtitle}
                </Text>
              </>
            )}
          </View>

          {!subscription.isPro ? (
            <DsListItem
              title={t('settings_subscription_upgrade')}
              subtitle={t('settings_subscription_upgrade_subtitle')}
              rightAccessory={chevron}
              accessibilityLabel={t('settings_subscription_upgrade_a11y')}
              disabled={busy}
              onPress={() => setPaywallVisible(true)}
            />
          ) : null}

          {purchasesAvailable ? (
            <DsListItem
              title={t('paywall_restore')}
              accessibilityLabel={t('paywall_restore_a11y')}
              disabled={busy}
              onPress={() => void runRestore()}
            />
          ) : null}

          {subscription.isPro && showManageBilling ? (
            <DsListItem
              title={t('settings_subscription_manage_billing')}
              rightAccessory={chevron}
              accessibilityLabel={t('settings_subscription_manage_billing_a11y')}
              disabled={busy}
              onPress={() => void runManageBilling()}
            />
          ) : null}

          {!purchasesAvailable ? (
            <Text
              allowFontScaling
              className="py-ds-md text-caption text-neutral-600 dark:text-neutral-400"
              maxFontSizeMultiplier={2}
            >
              {t('paywall_not_configured')}
            </Text>
          ) : null}

          {error != null ? (
            <Text
              allowFontScaling
              accessibilityRole="alert"
              className="py-ds-sm text-caption text-danger"
              maxFontSizeMultiplier={2}
            >
              {error}
            </Text>
          ) : null}

          {busy ? (
            <View className="items-center py-ds-sm">
              <ActivityIndicator />
            </View>
          ) : null}
        </View>
      )}

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSubscribed={() => {
          setError(null);
          void finishSync();
        }}
      />
    </>
  );
}
