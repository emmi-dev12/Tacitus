import type { ReactNode } from "react";
import { ClientProviders } from "../ClientProviders";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <ClientProviders>
      {children}
      <PwaInstallPrompt />
    </ClientProviders>
  );
}
