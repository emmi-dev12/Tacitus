"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredConvexUrl } from "@/lib/convexConfig";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const url = getStoredConvexUrl();
    router.replace(url ? "/landing" : "/setup");
  }, [router]);

  return null;
}
