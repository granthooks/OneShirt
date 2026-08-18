/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as admin from "../admin.js";
import type * as bids from "../bids.js";
import type * as crons from "../crons.js";
import type * as draws from "../draws.js";
import type * as generation from "../generation.js";
import type * as generation_helpers from "../generation_helpers.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as likes from "../likes.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as printify from "../printify.js";
import type * as printify_helpers from "../printify_helpers.js";
import type * as printify_webhook from "../printify_webhook.js";
import type * as seed from "../seed.js";
import type * as seed_art from "../seed_art.js";
import type * as seed_extra from "../seed_extra.js";
import type * as seed_rename from "../seed_rename.js";
import type * as shirts from "../shirts.js";
import type * as stripe from "../stripe.js";
import type * as stripe_helpers from "../stripe_helpers.js";
import type * as users from "../users.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  admin: typeof admin;
  bids: typeof bids;
  crons: typeof crons;
  draws: typeof draws;
  generation: typeof generation;
  generation_helpers: typeof generation_helpers;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/config": typeof lib_config;
  "lib/ledger": typeof lib_ledger;
  likes: typeof likes;
  notifications: typeof notifications;
  orders: typeof orders;
  printify: typeof printify;
  printify_helpers: typeof printify_helpers;
  printify_webhook: typeof printify_webhook;
  seed: typeof seed;
  seed_art: typeof seed_art;
  seed_extra: typeof seed_extra;
  seed_rename: typeof seed_rename;
  shirts: typeof shirts;
  stripe: typeof stripe;
  stripe_helpers: typeof stripe_helpers;
  users: typeof users;
  wallet: typeof wallet;
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

export declare const components: {};
