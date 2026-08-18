import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthConfigured } from "../lib/authConfig";

/**
 * Wraps `users.me` + auth state into one convenient hook. `user` is
 * `undefined` while loading, `null` for guests, or the users row.
 *
 * `isSignedIn` reflects Convex's server-acknowledged auth state
 * (`useConvexAuth().isAuthenticated`), NOT Clerk's own `isSignedIn`. On
 * load with an existing Clerk session there's a brief window where Clerk
 * reports signed-in before the Convex websocket has finished its own auth
 * handshake — during that window the server sees no identity, so any
 * query gated on Clerk's `isSignedIn` would fire unauthenticated and throw
 * NOT_AUTHENTICATED. Gating on Convex's own auth state instead means every
 * query gated via this hook only fires once the server actually has an
 * identity for the caller.
 *
 * In guest-preview mode (no Clerk key configured), neither Clerk's
 * `useAuth` nor `useConvexAuth` is ever called — `useConvexAuth` throws
 * outside a `ConvexProviderWithAuth` ancestor — so this always reports a
 * signed-out guest instead.
 */
export function useCurrentUser() {
  const authConfigured = useAuthConfigured();
  return authConfigured ? useCurrentUserClerk() : useCurrentUserGuest();
}

function useCurrentUserClerk() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return {
    isLoaded: !isLoading,
    isSignedIn: isAuthenticated,
    user: isAuthenticated ? user : null,
    isAdmin: user?.role === "admin",
  };
}

function useCurrentUserGuest() {
  return {
    isLoaded: true,
    isSignedIn: false,
    user: null,
    isAdmin: false,
  };
}
