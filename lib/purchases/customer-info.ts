import type { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';

import { PRO_ENTITLEMENT_ID } from '@/lib/purchases/constants';

export function getProEntitlement(info: CustomerInfo): PurchasesEntitlementInfo | null {
  return info.entitlements.active[PRO_ENTITLEMENT_ID] ?? null;
}

export function isProFromCustomerInfo(info: CustomerInfo): boolean {
  return getProEntitlement(info) != null;
}
