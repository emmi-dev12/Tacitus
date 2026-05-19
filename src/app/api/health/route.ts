import { NextResponse } from "next/server";

export function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
