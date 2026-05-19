import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";

const ConvexClientProvider = dynamic(
  () => import("./ConvexClientProvider").then((m) => m.ConvexClientProvider),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0F172A]">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    ),
  }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  fallback: ["system-ui", "sans-serif"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: "Tacitus",
  description: "Secure private messaging",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full bg-[#0F172A] text-white antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
