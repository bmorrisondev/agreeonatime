import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, View } from 'react-native';
import { makeFunctionReference } from 'convex/server';
import { useAction } from 'convex/react';

import { DsButton } from '@/components/design-system/button';
import { DsModal } from '@/components/design-system/modal-sheet';
import { useEntitlement } from '@/hooks/use-entitlement';
import { authClient } from '@/lib/auth-client';
import { t } from '@/lib/i18n/t';
import {
  getDefaultPackage,
  getMonthlyStoreProduct,
  getPackagePriceLabel,
  getStoreProductPriceLabel,
  identifyUser,
  isPurchasesConfigured,
  purchaseMonthlySubscription,
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

export function PaywallModal({ visible, onClose, onSubscribed }: PaywallModalProps): ReactElement {
  const sync = useAction(syncFromRevenueCatAction);
  const session = authClient.useSession();
  const { refresh } = useEntitlement();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);

  const canPurchase = supportsPurchasesPlatform() && isPurchasesConfigured();

  useEffect(() => {
    if (!visible || !canPurchase) {
      setMonthlyPrice(null);
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
      const [storeProduct, pkg] = await Promise.all([
        getMonthlyStoreProduct(),
        getDefaultPackage(),
      ]);
      if (cancelled) {
        return;
      }
      setMonthlyPrice(
        getStoreProductPriceLabel(storeProduct) ?? getPackagePriceLabel(pkg),
      );
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
      const info = await purchaseMonthlySubscription();
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
  }, [canPurchase, finishSubscribe, session.data?.user?.id]);

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

      {error != null ? (
        <Text
          allowFontScaling
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
            accessibilityLabel={t('paywall_subscribe_a11y')}
            disabled={busy}
            onPress={() => void onSubscribe()}
          >
            {busy
              ? t('paywall_working')
              : monthlyPrice != null
                ? t('paywall_subscribe_with_price', { price: monthlyPrice })
                : t('paywall_subscribe')}
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
