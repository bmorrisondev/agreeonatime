import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useAction } from 'convex/react';

import { DsButton } from '@/components/design-system/button';
import { DsModal } from '@/components/design-system/modal-sheet';
import { useEntitlement } from '@/hooks/use-entitlement';
import { authClient } from '@/lib/auth-client';
import { t } from '@/lib/i18n/t';
import type { ProBillingPeriod } from '@/lib/purchases/billing-period';
import {
  getAnnualPackage,
  getAnnualPackagePriceLabel,
  getAnnualStoreProduct,
  getAnnualStoreProductPriceLabel,
  getDefaultPackage,
  getMonthlyStoreProduct,
  getPackagePriceLabel,
  getStoreProductPriceLabel,
  identifyUser,
  isPurchasesConfigured,
  purchaseProSubscription,
  restorePurchases,
  supportsPurchasesPlatform,
} from '@/lib/purchases';
import Purchases from 'react-native-purchases';
import { isProFromCustomerInfo } from '@/lib/purchases/customer-info';

const syncFromRevenueCatAction = makeFunctionReference<'action'>('subscriptions:syncFromRevenueCat');

export interface PaywallModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSubscribed?: () => void;
}

interface PlanPrices {
  readonly monthly: string | null;
  readonly annual: string | null;
  readonly annualAvailable: boolean;
}

interface PlanOptionProps {
  readonly period: ProBillingPeriod;
  readonly title: string;
  readonly subtitle: string;
  readonly badge?: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onSelect: () => void;
}

function PlanOption({
  period,
  title,
  subtitle,
  badge,
  selected,
  disabled,
  onSelect,
}: PlanOptionProps): ReactElement {
  const a11yLabel =
    period === 'monthly' ? t('paywall_plan_select_monthly_a11y') : t('paywall_plan_select_yearly_a11y');

  return (
    <Pressable
      accessibilityLabel={a11yLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      className={[
        'mb-ds-sm rounded-ds-md border p-ds-md',
        'flex-1',
        selected
          ? 'border-brand bg-brand/10 dark:bg-brand/15'
          : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        disabled ? 'opacity-50' : 'active:opacity-80',
      ].join(' ')}
      disabled={disabled}
      onPress={onSelect}
      testID={period === 'monthly' ? 'paywall-plan-monthly' : 'paywall-plan-yearly'}
    >
      <View className="flex-row items-start justify-between gap-ds-xs">
        <Text
          allowFontScaling
          className="text-body font-semibold text-neutral-900 dark:text-neutral-100"
          maxFontSizeMultiplier={2}
        >
          {title}
        </Text>
        {badge != null ? (
          <View className="rounded-full bg-brand px-ds-sm py-0.5">
            <Text
              allowFontScaling
              className="text-caption font-semibold text-brand-on"
              maxFontSizeMultiplier={2}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        allowFontScaling
        className="mt-ds-xs text-caption text-neutral-600 dark:text-neutral-400"
        maxFontSizeMultiplier={2}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

export function PaywallModal({ visible, onClose, onSubscribed }: PaywallModalProps): ReactElement {
  const sync = useAction(syncFromRevenueCatAction);
  const session = authClient.useSession();
  const { refresh } = useEntitlement();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<PlanPrices>({
    monthly: null,
    annual: null,
    annualAvailable: false,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<ProBillingPeriod>('annual');

  const canPurchase = supportsPurchasesPlatform() && isPurchasesConfigured();

  useEffect(() => {
    if (!visible || !canPurchase) {
      setPrices({ monthly: null, annual: null, annualAvailable: false });
      return;
    }
    let cancelled = false;
    void (async () => {
      if (Platform.OS === 'ios') {
        try {
          await Purchases.invalidateCustomerInfoCache();
        } catch {
          // Best-effort; offerings fetch below still runs.
        }
      }
      const [monthlyStoreProduct, annualStoreProduct, monthlyPkg, annualPkg] = await Promise.all([
        getMonthlyStoreProduct(),
        getAnnualStoreProduct(),
        getDefaultPackage(),
        getAnnualPackage(),
      ]);
      if (cancelled) {
        return;
      }
      const monthly =
        getStoreProductPriceLabel(monthlyStoreProduct) ?? getPackagePriceLabel(monthlyPkg);
      const annual =
        getAnnualStoreProductPriceLabel(annualStoreProduct) ??
        getAnnualPackagePriceLabel(annualPkg);
      const annualAvailable = annualPkg != null || annualStoreProduct != null;
      setPrices({ monthly, annual, annualAvailable });
      setSelectedPeriod(annualAvailable ? 'annual' : 'monthly');
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, canPurchase]);

  const finishSubscribe = useCallback(async () => {
    await refresh();
    try {
      await sync();
    } catch {
      // Server sync can retry on next open; purchase already succeeded locally.
    }
    onSubscribed?.();
    onClose();
  }, [onClose, onSubscribed, refresh, sync]);

  const onSubscribe = useCallback(async () => {
    if (!canPurchase) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const userId = session.data?.user?.id;
      if (userId != null) {
        await identifyUser(userId);
      }
      const info = await purchaseProSubscription(selectedPeriod);
      if (info == null) {
        setError(t('paywall_no_plan'));
        return;
      }
      if (isProFromCustomerInfo(info)) {
        await finishSubscribe();
      } else {
        setError(t('paywall_purchase_no_entitlement'));
      }
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn('[paywall] purchase failed', e);
      }
      const cancelled =
        e != null &&
        typeof e === 'object' &&
        'userCancelled' in e &&
        (e as { userCancelled?: boolean }).userCancelled === true;
      if (!cancelled) {
        setError(t('paywall_purchase_error'));
      }
    } finally {
      setBusy(false);
    }
  }, [canPurchase, finishSubscribe, selectedPeriod, session.data?.user?.id]);

  const onRestore = useCallback(async () => {
    if (!canPurchase) {
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
        await finishSubscribe();
      } else {
        setError(t('paywall_restore_none'));
      }
    } catch {
      setError(t('paywall_restore_error'));
    } finally {
      setBusy(false);
    }
  }, [canPurchase, finishSubscribe, session.data?.user?.id]);

  const selectedPrice =
    selectedPeriod === 'annual'
      ? prices.annual
      : prices.monthly;

  const continueLabel =
    selectedPrice != null
      ? t('paywall_continue_with_price', { price: selectedPrice })
      : t('paywall_continue');

  return (
    <DsModal visible={visible} title={t('paywall_title')} onClose={busy ? () => undefined : onClose}>
      <Text
        allowFontScaling
        className="mb-ds-md text-body text-neutral-700 dark:text-neutral-300"
        maxFontSizeMultiplier={2}
      >
        {t('paywall_body')}
      </Text>

      {!canPurchase ? (
        <Text
          allowFontScaling
          className="mb-ds-lg text-caption text-neutral-600 dark:text-neutral-400"
          maxFontSizeMultiplier={2}
        >
          {t('paywall_not_configured')}
        </Text>
      ) : null}

      {canPurchase ? (
        <View
          className={[
            'mb-ds-md gap-ds-sm',
            prices.annualAvailable ? 'flex-row' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <PlanOption
            period="monthly"
            title={t('paywall_plan_monthly')}
            subtitle={
              prices.monthly != null
                ? t('paywall_plan_monthly_subtitle', { price: prices.monthly })
                : t('paywall_plan_price_loading')
            }
            selected={selectedPeriod === 'monthly'}
            disabled={busy}
            onSelect={() => setSelectedPeriod('monthly')}
          />
          {prices.annualAvailable ? (
            <PlanOption
              period="annual"
              title={t('paywall_plan_yearly')}
              subtitle={
                prices.annual != null
                  ? t('paywall_plan_yearly_subtitle', { price: prices.annual })
                  : t('paywall_plan_price_loading')
              }
              badge={t('paywall_plan_yearly_badge')}
              selected={selectedPeriod === 'annual'}
              disabled={busy}
              onSelect={() => setSelectedPeriod('annual')}
            />
          ) : null}
        </View>
      ) : null}

      {error != null ? (
        <Text
          allowFontScaling
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="mb-ds-md text-caption text-danger"
          maxFontSizeMultiplier={2}
        >
          {error}
        </Text>
      ) : null}

      {canPurchase ? (
        <>
          <DsButton
            accessibilityLabel={t('paywall_continue_a11y')}
            disabled={busy}
            onPress={() => void onSubscribe()}
          >
            {busy ? t('paywall_working') : continueLabel}
          </DsButton>
          <View className="mt-ds-sm">
            <DsButton
              variant="secondary"
              accessibilityLabel={t('paywall_restore_a11y')}
              disabled={busy}
              onPress={() => void onRestore()}
            >
              {t('paywall_restore')}
            </DsButton>
          </View>
        </>
      ) : (
        <DsButton
          variant="secondary"
          accessibilityLabel={t('paywall_close_a11y')}
          disabled={busy}
          onPress={onClose}
        >
          {t('paywall_close')}
        </DsButton>
      )}

      <View className="mt-ds-md items-center">
        {busy ? <ActivityIndicator /> : null}
        <Text
          allowFontScaling
          className="mt-ds-sm text-center text-caption text-neutral-500 dark:text-neutral-500"
          maxFontSizeMultiplier={2}
        >
          <Text
            accessibilityRole="link"
            className="text-brand"
            onPress={() => void Linking.openURL('https://agreeonatime.com/terms')}
          >
            {t('settings_terms')}
          </Text>
          {' · '}
          <Text
            accessibilityRole="link"
            className="text-brand"
            onPress={() => void Linking.openURL('https://agreeonatime.com/privacy')}
          >
            {t('settings_privacy')}
          </Text>
        </Text>
      </View>
    </DsModal>
  );
}
