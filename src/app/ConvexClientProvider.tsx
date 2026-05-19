"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

function makeConvexClient(): ConvexReactClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "wss:") {
    throw new Error("NEXT_PUBLIC_CONVEX_URL must use HTTPS or WSS.");
  }
  return new ConvexReactClient(url);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<ConvexReactClient | null>(null);
  if (clientRef.current === null) {
    clientRef.current = makeConvexClient();
  }

  useEffect(() => {
    const client = clientRef.current;
    return () => {
      client?.close();
    };
  }, []);

  return (
    <ConvexAuthProvider client={clientRef.current}>
      {children}
    </ConvexAuthProvider>
  );
}
