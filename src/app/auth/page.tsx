"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: mode === "signup" ? "signUp" : "signIn",
      });
      router.push("/inbox");
    } catch {
      setError(mode === "signup" ? "Could not create account" : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-[#1E293B] bg-[#0D1117] p-8">
        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Ghost<span className="text-emerald-400">Mail</span>
          </h1>
          <p className="text-xs text-slate-500">Disposable email · E2E encrypted</p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg border border-[#1E293B] p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-600"
            placeholder="Email address"
            autoComplete="email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-600"
            placeholder="Password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
