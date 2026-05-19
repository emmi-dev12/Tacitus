import { NextResponse } from "next/server";

// Public liveness endpoint — intentionally unauthenticated.
export function GET() {
  const ok = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  return NextResponse.json({ ok }, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
