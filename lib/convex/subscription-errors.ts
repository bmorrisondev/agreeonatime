import { ConvexError } from 'convex/values';

/** Structured Convex mutation errors for subscription limits (keep codes in sync with `convex/subscriptionLimits.ts`). */
export const SUBSCRIPTION_LIMIT_ERROR_CODES = {
  TooManyActiveEvents: 'TooManyActiveEvents',
  EventAtCapacity: 'EventAtCapacity',
} as const;

export type SubscriptionLimitErrorCode =
  (typeof SUBSCRIPTION_LIMIT_ERROR_CODES)[keyof typeof SUBSCRIPTION_LIMIT_ERROR_CODES];

interface SubscriptionLimitErrorData {
  readonly code: SubscriptionLimitErrorCode;
  readonly message: string;
}

export function isSubscriptionLimitErrorData(data: unknown): data is SubscriptionLimitErrorData {
  if (data == null || typeof data !== 'object') {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    typeof record.code === 'string' &&
    typeof record.message === 'string' &&
    record.message.length > 0
  );
}

export function getSubscriptionLimitErrorCode(error: unknown): SubscriptionLimitErrorCode | null {
  if (!(error instanceof ConvexError)) {
    return null;
  }
  const { data } = error;
  if (!isSubscriptionLimitErrorData(data)) {
    return null;
  }
  const codes = Object.values(SUBSCRIPTION_LIMIT_ERROR_CODES);
  if (!codes.includes(data.code as SubscriptionLimitErrorCode)) {
    return null;
  }
  return data.code;
}

export function isTooManyActiveEventsError(error: unknown): boolean {
  return (
    getSubscriptionLimitErrorCode(error) === SUBSCRIPTION_LIMIT_ERROR_CODES.TooManyActiveEvents
  );
}

export function isEventAtCapacityError(error: unknown): boolean {
  return getSubscriptionLimitErrorCode(error) === SUBSCRIPTION_LIMIT_ERROR_CODES.EventAtCapacity;
}
