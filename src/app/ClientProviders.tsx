"use client";

import { Component, useState, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { safeMessage } from "./convexErrorMessages";
import { getStoredConvexUrl } from "@/lib/convexConfig";

const ConvexClientProvider = dynamic(
  () => import("./ConvexClientProvider").then((m) => m.ConvexClientProvider),
  { ssr: false, loading: () => <Spinner /> }
);

// Routes that render without a Convex deployment configured
const NO_CONVEX_ROUTES = new Set(["/setup", "/landing"]);

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ClientProviders] Initialization error:", error, info);
    } else {
      console.error("[ClientProviders] Initialization error:", safeMessage(error));
    }
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

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center bg-[#0F172A]">
      <span className="text-slate-500 text-sm font-mono">Initializing…</span>
    </div>
  );
}

export function ClientProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // undefined = still reading localStorage; null = not configured; string = URL
  const [convexUrl, setConvexUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setConvexUrl(getStoredConvexUrl());
  }, []);

  // Redirect to setup when config is missing — done in effect, not during render
  useEffect(() => {
    if (convexUrl === null && !NO_CONVEX_ROUTES.has(pathname)) {
      window.location.replace("/setup");
    }
  }, [convexUrl, pathname]);

  if (convexUrl === undefined) return <Spinner />;

  // No config on a public route — render without Convex provider
  if (convexUrl === null) {
    if (!NO_CONVEX_ROUTES.has(pathname)) return <Spinner />;
    return <>{children}</>;
  }

  return (
    <ErrorBoundary>
      <ConvexClientProvider url={convexUrl}>{children}</ConvexClientProvider>
    </ErrorBoundary>
  );
}
