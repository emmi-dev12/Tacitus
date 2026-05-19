"use client";

import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { spaceMono, syne } from "../landing-fonts";

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();

  // Redirect already-authenticated users straight to their inbox.
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/inbox");
    }
  }, [isAuthenticated, authLoading, router]);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (trimmedUsername.length > 32) {
      setError("Username must be 32 characters or fewer");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(trimmedUsername)) {
      setError("Username may only contain letters, numbers, hyphens, and underscores");
      return;
    }
    if (mode === "signup" && password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        username: trimmedUsername,
        password,
        flow: mode === "signup" ? "signUp" : "signIn",
      });
      router.push("/inbox");
    } catch {
      setError(mode === "signup" ? "Could not create account" : "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  // Block the auth form from flashing to already-authenticated users
  // while the redirect is pending. Consistent with AuthRedirect on /landing.
  if (authLoading || isAuthenticated) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#080d14",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#00ff8c", opacity: 0.7,
          animation: "tacitus-pulse 1.2s ease-in-out infinite",
        }} />
      </div>
    );
  }

  return (
    <div
      className={`${spaceMono.variable} ${syne.variable}`}
      style={{
        minHeight: "100vh",
        background: "#080d14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "var(--font-space-mono), monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,140,0.008) 2px, rgba(0,255,140,0.008) 4px)",
        pointerEvents: "none", zIndex: 10,
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: "600px", height: "600px",
        background: "radial-gradient(ellipse at center, rgba(0,255,140,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "400px", position: "relative", zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.2em",
            color: "#00ff8c", marginBottom: "0.4rem",
          }}>
            ◈ TACITUS
          </div>
          <div style={{
            fontSize: "0.6rem", letterSpacing: "0.3em", color: "#2d4050",
          }}>
            {mode === "signin" ? "AUTHENTICATE SESSION" : "INITIALIZE ACCOUNT"}
          </div>
        </div>

        {/* Panel */}
        <div style={{
          border: "1px solid rgba(0,255,140,0.12)",
          background: "rgba(8,13,20,0.95)",
          backdropFilter: "blur(12px)",
          padding: "2rem",
        }}>
          {/* Mode toggle */}
          <div style={{
            display: "flex",
            border: "1px solid rgba(0,255,140,0.1)",
            marginBottom: "2rem",
          }}>
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setPassword(""); setUsername(""); }}
                style={{
                  flex: 1, padding: "0.6rem",
                  fontSize: "0.65rem", fontFamily: "inherit",
                  letterSpacing: "0.14em",
                  background: mode === m ? "rgba(0,255,140,0.1)" : "transparent",
                  color: mode === m ? "#00ff8c" : "#2d4050",
                  border: "none",
                  borderRight: m === "signin" ? "1px solid rgba(0,255,140,0.1)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {m === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem" }}>
                USERNAME
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#050a10",
                  border: "1px solid rgba(0,255,140,0.1)",
                  padding: "0.65rem 0.75rem",
                  fontSize: "0.8rem", fontFamily: "inherit",
                  color: "#c8d4e0",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(0,255,140,0.4)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(0,255,140,0.1)"}
                placeholder="ghost-ops"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem" }}>
                PASSWORD
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#050a10",
                  border: "1px solid rgba(0,255,140,0.1)",
                  padding: "0.65rem 0.75rem",
                  fontSize: "0.8rem", fontFamily: "inherit",
                  color: "#c8d4e0",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(0,255,140,0.4)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(0,255,140,0.1)"}
                placeholder={mode === "signup" ? "min. 12 characters" : "············"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 12 : undefined}
                maxLength={128}
                required
              />
            </div>

            {error && (
              <div style={{
                fontSize: "0.7rem", color: "#ff4455",
                letterSpacing: "0.04em", padding: "0.5rem 0",
              }}>
                ✕ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "0.5rem",
                width: "100%",
                background: loading ? "rgba(0,255,140,0.08)" : "#00ff8c",
                color: loading ? "#00ff8c" : "#080d14",
                border: "none",
                padding: "0.8rem",
                fontSize: "0.72rem", fontFamily: "inherit",
                fontWeight: 700,
                letterSpacing: "0.15em",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))",
              }}
            >
              {loading ? "AUTHENTICATING…" : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>
          </form>
        </div>

        <div style={{
          textAlign: "center", marginTop: "1.5rem",
          fontSize: "0.6rem", letterSpacing: "0.16em", color: "#1a2a36",
        }}>
          AES-256-GCM · PBKDF2 600K · ZERO SERVER KNOWLEDGE
        </div>
      </div>
    </div>
  );
}
