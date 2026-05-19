"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ConvexClientProvider = dynamic(
  () => import("./ConvexClientProvider").then((m) => m.ConvexClientProvider),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0F172A]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    ),
  }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
