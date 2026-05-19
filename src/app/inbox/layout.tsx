import type { ReactNode } from "react";
import { ClientProviders } from "../ClientProviders";

export default function InboxLayout({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
