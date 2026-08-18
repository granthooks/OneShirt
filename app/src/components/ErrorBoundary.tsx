import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { ErrorScreen } from "./ErrorScreen";

/**
 * Top-level render error boundary. Convex query errors that aren't caught
 * locally (e.g. an unexpected auth/backend failure) throw during render and
 * would otherwise blank the whole app — this renders the DESIGN.md
 * "CONNECTION LOST" screen with a Reload action instead.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[#111118]">
          <div className="flex h-full w-full max-w-[430px] flex-col">
            <ErrorScreen />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
