import type { ReactNode } from "react";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

// Server Component — ClientProviders is provided by the root layout.
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  );
}
