"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Root redirect — middleware handles this in dev/SSR mode.
// In the static export, this client component does the same job.
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/landing");
  }, [router]);
  return null;
}
