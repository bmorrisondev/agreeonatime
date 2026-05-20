/** Keep in sync with `convex/subscriptionLimits.ts`. */
export const FREE_MAX_ACTIVE_OPEN_EVENTS = 3;

/** Max unique voters per event on the free plan. */
export const FREE_MAX_VOTERS_PER_EVENT = 8;

/** Free users can see full vote results for events created within this window. */
export const FREE_HISTORY_VISIBLE_DAYS = 30;

export const FREE_HISTORY_RETENTION_MS = FREE_HISTORY_VISIBLE_DAYS * 24 * 60 * 60 * 1000;
