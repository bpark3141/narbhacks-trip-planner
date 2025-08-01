/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as destinations from "../destinations.js";
import type * as expenses from "../expenses.js";
import type * as itinerary from "../itinerary.js";
import type * as notes from "../notes.js";
import type * as openai from "../openai.js";
import type * as reminders from "../reminders.js";
import type * as trips from "../trips.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  destinations: typeof destinations;
  expenses: typeof expenses;
  itinerary: typeof itinerary;
  notes: typeof notes;
  openai: typeof openai;
  reminders: typeof reminders;
  trips: typeof trips;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
