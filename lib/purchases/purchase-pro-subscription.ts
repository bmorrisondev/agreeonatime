import type { CustomerInfo } from 'react-native-purchases';

import type { ProBillingPeriod } from '@/lib/purchases/billing-period';
import { purchaseAnnualSubscription } from '@/lib/purchases/annual-product';
import { purchaseMonthlySubscription } from '@/lib/purchases/monthly-product';

/** Purchase Pro for the selected billing period. */
export async function purchaseProSubscription(
  period: ProBillingPeriod,
): Promise<CustomerInfo | null> {
  if (period === 'annual') {
    return purchaseAnnualSubscription();
  }
  return purchaseMonthlySubscription();
}
