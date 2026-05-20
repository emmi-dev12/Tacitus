"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { SAFE_MESSAGES } from "./convexErrorMessages";

function makeConvexClient(url: string): ConvexReactClient {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Convex URL is not valid.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Convex URL must use HTTPS.");
  }
  if (!parsed.hostname.endsWith(".convex.cloud")) {
    throw new Error("Convex URL must be a *.convex.cloud deployment.");
  }
  try {
    return new ConvexReactClient(url);
  } catch (e) {
    if (e instanceof Error && SAFE_MESSAGES.has(e.message)) throw e;
    throw new Error("Could not connect to Convex — check your deployment URL.");
  }
}

export function ConvexClientProvider({ url, children }: { url: string; children: ReactNode }) {
  // Client is created lazily in the ref; never mutated during render.
  const clientRef = useRef<ConvexReactClient | null>(null);
  const urlRef = useRef<string | null>(null);

  // React-recommended lazy-ref initialisation (see "Avoiding recreating the ref
  // contents" in the React docs). The null guard runs in the render phase but
  // refs persist across Strict Mode's simulated unmount/remount, so this fires
  // exactly once per component lifetime — no duplicate WebSocket connections.
  if (clientRef.current === null) {
    clientRef.current = makeConvexClient(url);
    urlRef.current = url;
  }

  // If the URL changes (user reconfigured), replace the client outside of render.
  useEffect(() => {
    if (urlRef.current === url) return;
    const old = clientRef.current;
    clientRef.current = makeConvexClient(url);
    urlRef.current = url;
    // Close old client after React has committed new tree
    old?.close();
  }, [url]);

  return (
    <ConvexAuthProvider client={clientRef.current}>
      {children}
    </ConvexAuthProvider>
  );
}
