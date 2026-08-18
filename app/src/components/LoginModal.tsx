import { useState } from "react";
import { useMutation } from "convex/react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { AnimatePresence } from "framer-motion";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { api } from "../../convex/_generated/api";
import { useAuthConfigured } from "../lib/authConfig";

type Stage = "email" | "code" | "sent-error";

/**
 * Entry point: routes to the Clerk-backed login flow, or a guest-mode
 * notice, depending on whether Clerk is configured. Keeping the branch
 * here means the Clerk hooks (`useSignIn`/`useSignUp`) are only ever
 * called when a ClerkProvider is mounted — those hooks throw otherwise.
 */
export function LoginModal({ onClose }: { onClose: () => void }) {
  const authConfigured = useAuthConfigured();
  return authConfigured ? (
    <LoginModalClerk onClose={onClose} />
  ) : (
    <LoginModalGuest onClose={onClose} />
  );
}

/**
 * Guest-preview mode: no VITE_CLERK_PUBLISHABLE_KEY configured, so there's
 * no auth flow to run. Explains this to the player instead of attempting
 * (and crashing on) a Clerk sign-in.
 */
function LoginModalGuest({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <Modal onClose={onClose} zIndex={80}>
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-lg uppercase text-white">
            Auth not configured
          </h2>
          <p className="text-xs text-muted">
            Add <code className="text-lime">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
            to enable login. You can still browse the deck as a guest.
          </p>
          <Button type="button" variant="lime" onClick={onClose} className="w-full">
            Got it
          </Button>
        </div>
      </Modal>
    </AnimatePresence>
  );
}

/**
 * Clerk headless email-code auth inside the app's login modal, styled per
 * DESIGN.md's magic-link modal (relabeled "SEND CODE" + 6-digit input,
 * "sent" state kept). Tries sign-in first; falls back to sign-up (with an
 * 18+ attestation) if no account exists for the email.
 */
function LoginModalClerk({ onClose }: { onClose: () => void }) {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const ensureUser = useMutation(api.users.ensureUser);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<Stage>("email");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signInLoaded || !signUpLoaded) return;
    setError(null);

    if (mode === "signUp" && !attested) {
      setError("Please confirm you are 18 or older.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signIn") {
        await signIn.create({ identifier: email, strategy: "email_code" });
        setStage("code");
      } else {
        await signUp.create({ emailAddress: email });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setStage("code");
      }
    } catch (err: unknown) {
      // No account for this email under sign-in -> switch to sign-up flow.
      const clerkErr = err as { errors?: Array<{ code?: string }> };
      const notFound = clerkErr?.errors?.some(
        (e) => e.code === "form_identifier_not_found"
      );
      if (mode === "signIn" && notFound) {
        setMode("signUp");
        setError(null);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signInLoaded || !signUpLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signIn") {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (result.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          await ensureUser({});
          onClose();
        } else {
          setError("Invalid code. Please try again.");
        }
      } else {
        const result = await signUp.attemptEmailAddressVerification({ code });
        if (result.status === "complete") {
          await setActiveSignUp({ session: result.createdSessionId });
          await ensureUser({});
          onClose();
        } else {
          setError("Invalid code. Please try again.");
        }
      }
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <Modal onClose={onClose} zIndex={80}>
        {stage === "email" && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <h2 className="text-center text-sm font-medium uppercase tracking-[1px] text-muted">
              Log in with{" "}
              <span className="font-[family-name:var(--font-display)] text-lime">
                Magic Code
              </span>
            </h2>
            <p className="text-center text-xs text-muted">
              No passwords. New players get free welcome credits to start
              swiping.
            </p>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border2 bg-ink px-4 py-3 text-sm text-white outline-none focus:border-lime"
            />
            {mode === "signUp" && (
              <label className="flex items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-0.5"
                />
                I confirm I am 18 years of age or older.
              </label>
            )}
            {error && <p className="text-xs text-pink">{error}</p>}
            <Button type="submit" variant="lime" disabled={submitting}>
              {submitting ? "Sending…" : "Send Code"}
            </Button>
          </form>
        )}

        {stage === "code" && (
          <form onSubmit={handleVerifyCode} className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-lime text-2xl">
              &#9993;
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-lg uppercase text-white">
              Check your email
            </h2>
            <p className="text-xs text-muted">
              We sent a 6-digit code to <strong className="text-white">{email}</strong>
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-border2 bg-ink px-4 py-3 text-center text-lg tracking-[6px] text-white outline-none focus:border-lime"
            />
            {error && <p className="text-xs text-pink">{error}</p>}
            <Button type="submit" variant="lime" disabled={submitting} className="w-full">
              {submitting ? "Verifying…" : "Verify"}
            </Button>
          </form>
        )}
      </Modal>
    </AnimatePresence>
  );
}
