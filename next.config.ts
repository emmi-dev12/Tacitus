import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Render static site hosting.
  // All backend logic lives in Convex — the Next.js layer is purely a client-side SPA.
  output: "export",
  // Trailing slash generates out/auth/index.html etc., which works cleanly
  // with Render's static file routing without needing a _redirects fallback.
  trailingSlash: true,
};

export default nextConfig;
