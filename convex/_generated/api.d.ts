/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as eventDeletion from "../eventDeletion.js";
import type * as events from "../events.js";
import type * as guestEvents from "../guestEvents.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as site_origins from "../site_origins.js";
import type * as subscriptionLimits from "../subscriptionLimits.js";
import type * as subscriptions from "../subscriptions.js";
import type * as timeRounding from "../timeRounding.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  eventDeletion: typeof eventDeletion;
  events: typeof events;
  guestEvents: typeof guestEvents;
  http: typeof http;
  notifications: typeof notifications;
  site_origins: typeof site_origins;
  subscriptionLimits: typeof subscriptionLimits;
  subscriptions: typeof subscriptions;
  timeRounding: typeof timeRounding;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
