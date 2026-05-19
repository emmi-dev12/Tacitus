"use client";

import { Component, type ReactNode } from "react";
import { ConvexClientProvider } from "./ConvexClientProvider";

// Known safe error messages we expose verbatim to the user.
// All other errors are collapsed to a generic message to prevent
// accidental info disclosure (e.g. env var values in URL parse errors).
const SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "NEXT_PUBLIC_CONVEX_URL is not configured.",
  "NEXT_PUBLIC_CONVEX_URL must use HTTPS or WSS.",
]);

function safeMessage(error: Error): string {
  if (SAFE_MESSAGES.has(error.message)) return error.message;
  return "Configuration error — please reload the page or contact support.";
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for observability; does not expose anything to the DOM.
    console.error("[ClientProviders] Initialization error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0F172A]">
          <p className="text-red-400 text-sm font-mono">
            Failed to initialize: {safeMessage(this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs font-mono text-slate-400 underline hover:text-slate-200"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ErrorBoundary>
  );
}
