import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/**
 * Whether Clerk is mounted (VITE_CLERK_PUBLISHABLE_KEY present). When
 * `false`, the app runs in guest-preview mode: no ClerkProvider exists in
 * the tree, so components must not call any `@clerk/clerk-react` hooks
 * (they throw outside a ClerkProvider). Components that need to branch on
 * this should render separate Clerk/guest child components rather than
 * conditionally skipping a Clerk hook call.
 */
const AuthConfigContext = createContext<boolean | null>(null);

export function AuthConfigProvider({
  authConfigured,
  children,
}: {
  authConfigured: boolean;
  children: ReactNode;
}) {
  return (
    <AuthConfigContext.Provider value={authConfigured}>
      {children}
    </AuthConfigContext.Provider>
  );
}

export function useAuthConfigured(): boolean {
  const ctx = useContext(AuthConfigContext);
  if (ctx === null) {
    throw new Error("useAuthConfigured must be used within an AuthConfigProvider");
  }
  return ctx;
}
