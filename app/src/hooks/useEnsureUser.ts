import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Guarantees a `users` row exists for the authenticated Clerk identity,
 * even when sign-in happens outside `LoginModal` (restored session on
 * reload, sign-in on another device/tab, ticket/token sign-ins). Without
 * this, `users.me` returns `null` forever for that session since nothing
 * ever called `users.ensureUser`.
 *
 * Only call this from a component mounted under a ClerkProvider +
 * ConvexProviderWithClerk (i.e. the `authConfigured` branch) — it uses
 * `useConvexAuth`, which throws under a plain `ConvexProvider`.
 *
 * `users.ensureUser` is idempotent (no-op if the row already exists), so
 * this is safe to call from multiple mount points (e.g. both the player
 * shell and the admin shell).
 */
export function useEnsureUser(): void {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const ensureUser = useMutation(api.users.ensureUser);
  const requested = useRef(false);

  useEffect(() => {
    if (isAuthenticated && me === null && !requested.current) {
      requested.current = true;
      void ensureUser({});
    }
    if (!isAuthenticated) {
      requested.current = false;
    }
  }, [isAuthenticated, me, ensureUser]);
}
