import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesEntitlementInfo } from 'react-native-purchases';

import { isPurchasesConfigured } from '@/lib/purchases/configured-state';
import { supportsPurchasesPlatform } from '@/lib/purchases/platform';

/** App Store subscription management (required for cancel disclosure). */
export const IOS_SUBSCRIPTION_MANAGEMENT_URL = 'itms-apps://apps.apple.com/account/subscriptions';

async function loadCustomerInfo(): Promise<CustomerInfo | null> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return null;
  }
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/** RevenueCat subscriber management URL (Web Billing / Stripe). */
export function getManagementUrlFromCustomerInfo(info: CustomerInfo): string | null {
  const url = info.managementURL?.trim();
  return url != null && url.length > 0 ? url : null;
}

export type ProPeriodLabel =
  | { readonly kind: 'renews'; readonly date: string }
  | { readonly kind: 'expires'; readonly date: string };

export function getProPeriodLabel(ent: PurchasesEntitlementInfo): ProPeriodLabel | null {
  const exp = ent.expirationDate;
  if (exp == null || exp.length === 0) {
    return null;
  }
  const date = new Date(exp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const formatted = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return ent.willRenew ? { kind: 'renews', date: formatted } : { kind: 'expires', date: formatted };
}

export async function canOpenSubscriptionManagement(): Promise<boolean> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return false;
  }
  if (Platform.OS === 'ios') {
    return true;
  }
  if (Platform.OS === 'web') {
    const info = await loadCustomerInfo();
    return info != null && getManagementUrlFromCustomerInfo(info) != null;
  }
  return false;
}

/** Opens App Store subscription settings (iOS) or billing portal URL (web). */
export async function openSubscriptionManagement(): Promise<boolean> {
  if (!supportsPurchasesPlatform() || !isPurchasesConfigured()) {
    return false;
  }

  if (Platform.OS === 'ios') {
    const canOpen = await Linking.canOpenURL(IOS_SUBSCRIPTION_MANAGEMENT_URL);
    if (canOpen) {
      await Linking.openURL(IOS_SUBSCRIPTION_MANAGEMENT_URL);
      return true;
    }
    await Purchases.showManageSubscriptions();
    return true;
  }

  if (Platform.OS === 'web') {
    const info = await loadCustomerInfo();
    const url = info != null ? getManagementUrlFromCustomerInfo(info) : null;
    if (url == null) {
      return false;
    }
    await Linking.openURL(url);
    return true;
  }

  return false;
}
