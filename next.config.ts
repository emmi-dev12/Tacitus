import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.mail.tm",
  // next/font/google downloads fonts at build time and serves them from 'self' — no runtime Google requests
  "font-src 'self'",
  // Tailwind v4 generates class-based styles at build time — no unsafe-inline needed
  "style-src 'self'",
  "script-src 'self'",
  // blob: needed for srcDoc iframes (Chrome maps srcDoc to blob: origin)
  "frame-src blob:",
  // No data: URIs — prevents tracking pixel bypass
  "img-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), fullscreen=(self)",
          },
          // No `preload` until custom domain is confirmed HTTPS-only on all subdomains
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
