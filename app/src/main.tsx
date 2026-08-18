import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import "./index.css";
import App from "./App.tsx";
import { AuthConfigProvider } from "./lib/authConfig.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function SetupNeeded() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        background: "#111118",
        color: "#ffffff",
        fontFamily: "'Space Grotesk', sans-serif",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1
        style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: "24px",
          color: "#c6ff4d",
          margin: 0,
        }}
      >
        SETUP NEEDED
      </h1>
      <p style={{ color: "#9d9db8", maxWidth: "360px", margin: 0 }}>
        Missing environment variable:{" "}
        <strong style={{ color: "#ff2d78" }}>VITE_CONVEX_URL</strong>
      </p>
      <p style={{ color: "#6c6c8f", maxWidth: "360px", fontSize: "13px" }}>
        Copy <code>.env.local.example</code> to <code>.env.local</code> and
        fill in the values, then restart the dev server.
      </p>
    </div>
  );
}

const rootElement = document.getElementById("root")!;

if (!convexUrl) {
  createRoot(rootElement).render(
    <StrictMode>
      <SetupNeeded />
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  if (clerkPublishableKey) {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <AuthConfigProvider authConfigured>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </AuthConfigProvider>
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  } else {
    // Guest-preview mode: no Clerk key configured. Deck browsing works
    // (shirts.getDeck is guest-safe); login attempts show a notice instead
    // of calling any Clerk hook (which would throw without a ClerkProvider).
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <ConvexProvider client={convex}>
            <AuthConfigProvider authConfigured={false}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthConfigProvider>
          </ConvexProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  }
}
