import type { ReactNode } from "react";

// Server Component — ClientProviders is provided by the root layout.
export default function InboxLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
