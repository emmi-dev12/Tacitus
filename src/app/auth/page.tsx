"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { spaceMono, syne } from "../landing-fonts";
import { generatePassphrase } from "@/lib/wordlist";
import { setPendingPassphrase } from "@/lib/pendingPassphrase";
import { deriveKey, generateSalt, createSentinel, exportKeyAsRecoveryCode } from "@/lib/crypto";
import { setKey } from "@/lib/keyStore";
import { api } from "../../../convex/_generated/api";

const USERNAME_RE = /^[a-z0-9_-]+$/;

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%", boxSizing: "border-box",
    background: "#050a10",
    border: `1px solid ${focused ? "rgba(0,255,140,0.4)" : "rgba(0,255,140,0.1)"}`,
    padding: "0.65rem 0.75rem",
    fontSize: "0.8rem", fontFamily: "var(--font-space-mono), monospace",
    color: "#c8d4e0", outline: "none",
    transition: "border-color 0.15s",
  };
}

// ---------------------------------------------------------------------------
// Signup view — show auto-generated passphrase, copy, re-generate, submit
// ---------------------------------------------------------------------------
function SignupView({ onSwitchToSignin }: { onSwitchToSignin: () => void }) {
  const { signIn } = useAuthActions();
  const setProfile = useMutation(api.users.setProfile);
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState(() => generatePassphrase());
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{ username: string; passphrase: string; recoveryCode: string } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const regenerate = () => {
    setPassphrase(generatePassphrase());
    setCopied(false);
  };

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore — user can select manually */ }
  }, [passphrase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const u = username.trim().toLowerCase();
    if (u.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (u.length > 32) { setError("Username must be 32 characters or fewer"); return; }
    if (!USERNAME_RE.test(u)) { setError("Username may only contain letters, numbers, hyphens, and underscores"); return; }
    setLoading(true);
    try {
      await signIn("password", { username: u, password: passphrase, flow: "signUp" });
      // Store passphrase immediately — if anything below fails, inbox auto-unlock still works
      setPendingPassphrase(passphrase);
      // Run both PBKDF2 derivations in parallel (each at 600k iterations)
      const salt = generateSalt();
      const [{ key, sentinel }, recoveryCode] = await Promise.all([
        deriveKey(passphrase, salt).then(async (k) => ({ key: k, sentinel: await createSentinel(k) })),
        exportKeyAsRecoveryCode(passphrase, salt),
      ]);
      await setProfile({ pbkdf2Salt: salt, encryptedSentinel: sentinel.encryptedSentinel, sentinelIv: sentinel.sentinelIv });
      setKey(key);
      setShowSuccess({ username: u, passphrase, recoveryCode });
    } catch {
      setError("Could not create account — username may already be taken");
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    // Fragment (#) is never sent to the server — credentials stay off access logs.
    const qrValue = `${window.location.origin}/auth#u=${encodeURIComponent(showSuccess.username)}&p=${encodeURIComponent(showSuccess.passphrase)}`;
    return (
      <SuccessScreen
        username={showSuccess.username}
        passphrase={showSuccess.passphrase}
        recoveryCode={showSuccess.recoveryCode}
        qrValue={qrValue}
        acknowledged={acknowledged}
        onAcknowledge={setAcknowledged}
        onContinue={() => router.replace("/inbox")}
      />
    );
  }

  return (
    <AuthShell subtitle="INITIALIZE ACCOUNT">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Field label="USERNAME">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle(usernameFocused)}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
            placeholder="ghost-ops"
            autoComplete="username"
            required
          />
        </Field>

        <div>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem" }}>
            YOUR PASSPHRASE
          </div>
          <div style={{
            background: "#050a10",
            border: "1px solid rgba(0,255,140,0.15)",
            padding: "0.75rem",
            marginBottom: "0.5rem",
          }}>
            <code style={{ fontSize: "0.85rem", color: "#00ff8c", letterSpacing: "0.06em", wordBreak: "break-all" }}>
              {passphrase}
            </code>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={copy}
              style={{
                flex: 1, padding: "0.5rem",
                background: copied ? "rgba(0,255,140,0.1)" : "rgba(0,255,140,0.08)",
                color: copied ? "#00ff8c" : "#4a8060",
                border: "1px solid rgba(0,255,140,0.15)",
                fontSize: "0.62rem", letterSpacing: "0.12em", fontFamily: "inherit",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {copied ? "✓ COPIED" : "COPY"}
            </button>
            <button
              type="button"
              onClick={regenerate}
              style={{
                flex: 1, padding: "0.5rem",
                background: "transparent",
                color: "#2d4050",
                border: "1px solid rgba(0,255,140,0.08)",
                fontSize: "0.62rem", letterSpacing: "0.12em", fontFamily: "inherit",
                cursor: "pointer", transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#4a6070"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#2d4050"}
            >
              REGENERATE
            </button>
          </div>
          <p style={{ fontSize: "0.6rem", color: "#2d4050", letterSpacing: "0.04em", marginTop: "0.5rem" }}>
            This passphrase is your only key — save it before continuing.
          </p>
        </div>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <SubmitBtn loading={loading}>CREATE ACCOUNT</SubmitBtn>

        <button
          type="button"
          onClick={onSwitchToSignin}
          style={{
            background: "none", border: "none", fontFamily: "inherit",
            fontSize: "0.62rem", letterSpacing: "0.08em", color: "#2d4050",
            cursor: "pointer", transition: "color 0.15s", marginTop: "0.25rem",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#4a6070"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#2d4050"}
        >
          already have an account? sign in →
        </button>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Signin view
// ---------------------------------------------------------------------------
function SigninView({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passphraseFocused, setPassphraseFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill from QR code scan (hash fragment: #u=USERNAME&p=PASSPHRASE)
  // Hash is never sent to the server — safe to carry credentials this way.
  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading #
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const u = params.get("u");
    const p = params.get("p");
    if (u) setUsername(u);
    if (p) setPassphrase(p);
    // Clear immediately so credentials don't persist in address bar or history
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn("password", {
        username: username.trim().toLowerCase(),
        password: passphrase,
        flow: "signIn",
      });
      setPendingPassphrase(passphrase);
      router.push("/inbox");
    } catch {
      setError("Invalid username or passphrase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="AUTHENTICATE SESSION">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Field label="USERNAME">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle(usernameFocused)}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
            placeholder="ghost-ops"
            autoComplete="username"
            required
          />
        </Field>

        <Field label="PASSPHRASE">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            style={inputStyle(passphraseFocused)}
            onFocus={() => setPassphraseFocused(true)}
            onBlur={() => setPassphraseFocused(false)}
            placeholder="word-word-word-word-word"
            autoComplete="off"
            required
          />
        </Field>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <SubmitBtn loading={loading}>SIGN IN</SubmitBtn>

        <button
          type="button"
          onClick={onSwitchToSignup}
          style={{
            background: "none", border: "none", fontFamily: "inherit",
            fontSize: "0.62rem", letterSpacing: "0.08em", color: "#2d4050",
            cursor: "pointer", transition: "color 0.15s", marginTop: "0.25rem",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#4a6070"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#2d4050"}
        >
          no account yet? create one →
        </button>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Success screen — shown after signup with passphrase + QR code
// ---------------------------------------------------------------------------
function SuccessScreen({
  username,
  passphrase,
  recoveryCode,
  qrValue,
  acknowledged,
  onAcknowledge,
  onContinue,
}: {
  username: string;
  passphrase: string;
  recoveryCode: string;
  qrValue: string;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
  onContinue: () => void;
}) {
  const [copiedPassphrase, setCopiedPassphrase] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const copyPassphrase = async () => {
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopiedPassphrase(true);
      setTimeout(() => setCopiedPassphrase(false), 2000);
    } catch { /* ignore */ }
  };

  const copyRecovery = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div
      className={`${spaceMono.variable} ${syne.variable}`}
      style={{
        minHeight: "100vh", background: "#080d14",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem", fontFamily: "var(--font-space-mono), monospace",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "fixed", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,140,0.008) 2px, rgba(0,255,140,0.008) 4px)", pointerEvents: "none", zIndex: 10 }} />
      <div style={{ width: "100%", maxWidth: "480px", position: "relative", zIndex: 20 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.18em", color: "#00ff8c" }}>◈ TACITUS</div>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", color: "#2d4050", marginTop: "0.3rem" }}>ACCOUNT CREATED</div>
        </div>
        <div style={{ border: "1px solid rgba(0,255,140,0.12)", background: "rgba(8,13,20,0.98)", padding: "2rem" }}>
          <p style={{ fontSize: "0.7rem", lineHeight: 1.7, color: "#4a6070", marginBottom: "1.5rem" }}>
            Account <span style={{ color: "#c8d4e0" }}>{username}</span> created.
            Save your passphrase and recovery code — they are the <span style={{ color: "#c8d4e0" }}>only way</span> to access your data.
          </p>

          {/* Passphrase */}
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem" }}>PASSPHRASE</div>
          <div style={{ background: "#050a10", border: "1px solid rgba(0,255,140,0.2)", padding: "0.85rem", marginBottom: "0.5rem" }}>
            <code style={{ fontSize: "0.95rem", color: "#00ff8c", letterSpacing: "0.06em", wordBreak: "break-all", display: "block" }}>
              {passphrase}
            </code>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              onClick={copyPassphrase}
              style={{
                flex: 1, padding: "0.55rem",
                background: copiedPassphrase ? "rgba(0,255,140,0.1)" : "#00ff8c",
                color: copiedPassphrase ? "#00ff8c" : "#080d14",
                border: copiedPassphrase ? "1px solid rgba(0,255,140,0.3)" : "none",
                fontSize: "0.62rem", letterSpacing: "0.12em", fontFamily: "inherit", fontWeight: 700,
                cursor: "pointer",
                clipPath: "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))",
              }}
            >
              {copiedPassphrase ? "✓ COPIED" : "COPY"}
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              style={{
                flex: 1, padding: "0.55rem",
                background: showQR ? "rgba(0,255,140,0.08)" : "transparent",
                color: showQR ? "#00ff8c" : "#4a6070",
                border: "1px solid rgba(0,255,140,0.15)",
                fontSize: "0.62rem", letterSpacing: "0.12em", fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {showQR ? "HIDE QR" : "QR FOR MOBILE"}
            </button>
          </div>

          {showQR && (
            <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ background: "#fff", padding: "0.75rem" }}>
                <QRCode value={qrValue} size={148} />
              </div>
              <p style={{ fontSize: "0.58rem", color: "#2d4050", letterSpacing: "0.04em", textAlign: "center" }}>
                Scan to open Tacitus on another device — credentials pre-filled via URL fragment (never sent to server).
              </p>
            </div>
          )}

          {/* Recovery code */}
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem" }}>RECOVERY CODE</div>
          <div style={{ marginBottom: "0.5rem" }}>
            <button
              onClick={() => setShowRecovery(!showRecovery)}
              style={{
                width: "100%", padding: "0.55rem",
                background: "transparent", color: "#3a5060",
                border: "1px dashed rgba(0,255,140,0.1)",
                fontSize: "0.62rem", letterSpacing: "0.1em", fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {showRecovery ? "HIDE" : "SHOW RECOVERY CODE"}
            </button>
          </div>
          {showRecovery && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ background: "#050a10", border: "1px solid rgba(0,255,140,0.12)", padding: "0.75rem", marginBottom: "0.5rem" }}>
                <code style={{ fontSize: "0.62rem", color: "#00a060", lineHeight: 1.6, wordBreak: "break-all", display: "block" }}>
                  {recoveryCode}
                </code>
              </div>
              <button
                onClick={copyRecovery}
                style={{
                  width: "100%", padding: "0.5rem",
                  background: copiedRecovery ? "rgba(0,255,140,0.08)" : "transparent",
                  color: copiedRecovery ? "#00ff8c" : "#3a5060",
                  border: "1px solid rgba(0,255,140,0.1)",
                  fontSize: "0.62rem", letterSpacing: "0.1em", fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {copiedRecovery ? "✓ COPIED" : "COPY RECOVERY CODE"}
              </button>
              <p style={{ fontSize: "0.58rem", color: "#2d4050", marginTop: "0.5rem", letterSpacing: "0.04em" }}>
                Store in a password manager. Anyone with this code can decrypt all your messages — treat it as carefully as your passphrase.
              </p>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer", marginBottom: "1rem" }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => onAcknowledge(e.target.checked)}
              style={{ accentColor: "#00ff8c", marginTop: "2px", flexShrink: 0 }}
            />
            <span style={{ fontSize: "0.65rem", color: "#4a6070", letterSpacing: "0.04em", lineHeight: 1.5 }}>
              I&apos;ve saved my passphrase and recovery code
            </span>
          </label>

          <button
            disabled={!acknowledged}
            onClick={onContinue}
            style={{
              width: "100%", padding: "0.75rem",
              background: acknowledged ? "#00ff8c" : "rgba(0,255,140,0.06)",
              color: acknowledged ? "#080d14" : "#2d4050",
              border: acknowledged ? "none" : "1px solid rgba(0,255,140,0.1)",
              fontSize: "0.68rem", letterSpacing: "0.15em", fontFamily: "inherit", fontWeight: 700,
              cursor: acknowledged ? "pointer" : "not-allowed",
              clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))",
            }}
          >
            ENTER INBOX →
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div
      className={`${spaceMono.variable} ${syne.variable}`}
      style={{
        minHeight: "100vh", background: "#080d14",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem", fontFamily: "var(--font-space-mono), monospace",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "fixed", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,140,0.008) 2px, rgba(0,255,140,0.008) 4px)", pointerEvents: "none", zIndex: 10 }} />
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "600px", height: "600px", background: "radial-gradient(ellipse at center, rgba(0,255,140,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 20 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.2em", color: "#00ff8c", marginBottom: "0.4rem" }}>◈ TACITUS</div>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#2d4050" }}>{subtitle}</div>
        </div>
        <div style={{ border: "1px solid rgba(0,255,140,0.12)", background: "rgba(8,13,20,0.95)", backdropFilter: "blur(12px)", padding: "2rem" }}>
          {children}
        </div>
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.6rem", letterSpacing: "0.16em", color: "#1a2a36" }}>
          AES-256-GCM · PBKDF2 600K · ZERO SERVER KNOWLEDGE
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem" }}>{label}</div>
      {children}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.7rem", color: "#ff4455", letterSpacing: "0.04em", padding: "0.25rem 0" }}>
      ✕ {children}
    </div>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        marginTop: "0.5rem", width: "100%",
        background: loading ? "rgba(0,255,140,0.08)" : "#00ff8c",
        color: loading ? "#00ff8c" : "#080d14",
        border: loading ? "1px solid rgba(0,255,140,0.2)" : "none",
        padding: "0.8rem",
        fontSize: "0.72rem", fontFamily: "var(--font-space-mono), monospace",
        fontWeight: 700, letterSpacing: "0.15em",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))",
      }}
    >
      {loading ? "PLEASE WAIT…" : children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page entry point
// ---------------------------------------------------------------------------
export default function AuthPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Detect ?signup=1 in URL for direct links to signup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") === "1") setMode("signup");
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/inbox");
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || isAuthenticated) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#080d14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff8c", opacity: 0.7, animation: "tacitus-pulse 1.2s ease-in-out infinite" }} />
      </div>
    );
  }

  return mode === "signup"
    ? <SignupView onSwitchToSignin={() => setMode("signin")} />
    : <SigninView onSwitchToSignup={() => setMode("signup")} />;
}
