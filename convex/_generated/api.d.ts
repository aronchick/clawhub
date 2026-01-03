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
import type * as comments from "../comments.js";
import type * as downloads from "../downloads.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_embeddings from "../lib/embeddings.js";
import type * as lib_skills from "../lib/skills.js";
import type * as search from "../search.js";
import type * as skills from "../skills.js";
import type * as stars from "../stars.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  comments: typeof comments;
  downloads: typeof downloads;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/embeddings": typeof lib_embeddings;
  "lib/skills": typeof lib_skills;
  search: typeof search;
  skills: typeof skills;
  stars: typeof stars;
  uploads: typeof uploads;
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

export declare const components: {};
