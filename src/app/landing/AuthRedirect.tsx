"use client";

import { useState, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { getStoredConvexUrl } from "@/lib/convexConfig";

function AuthRedirectInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/inbox");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#080d14",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#00ff8c", opacity: 0.7,
          animation: "tacitus-pulse 1.2s ease-in-out infinite",
        }} />
      </div>
    );
  }

  return null;
}

export function AuthRedirect() {
  // Use state + effect to avoid SSR/hydration mismatch on the localStorage check
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);

  useEffect(() => {
    setHasConfig(getStoredConvexUrl() !== null);
  }, []);

  // null = still checking; render nothing until client-side check resolves
  if (!hasConfig) return null;
  return <AuthRedirectInner />;
}
