"use client";

import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";

// Blocks the landing page from rendering until auth state is confirmed.
// Prevents authenticated users from seeing the marketing page + wrong CTAs
// during the window between hydration and the Convex auth check resolving.
export function AuthRedirect() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/inbox");
    }
  }, [isAuthenticated, isLoading, router]);

  // Suppress the entire page while auth state is unknown or redirect is pending.
  // This prevents: (a) wrong CTAs showing to logged-in users, (b) flash of
  // marketing content before /inbox redirect fires.
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
