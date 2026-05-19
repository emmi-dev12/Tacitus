"use client";

import { useState, useEffect } from "react";
import { spaceMono, syne } from "@/app/landing-fonts";

const THROTTLE_KEY = "tacitus_unlock_throttle";
const RECOVERY_DISPLAY_TIMEOUT_MS = 5 * 60 * 1000;

interface Props {
  mode: "setup" | "unlock";
  onSetup?: (passphrase: string) => Promise<string>;
  onUnlock?: (passphrase: string) => Promise<void>;
  onRecovery?: (code: string) => Promise<void>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#050a10",
  border: "1px solid rgba(0,255,140,0.1)",
  padding: "0.65rem 0.75rem",
  fontSize: "0.8rem",
  fontFamily: "var(--font-space-mono), monospace",
  color: "#c8d4e0",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem",
};

export function PassphraseSetup({ mode, onSetup, onUnlock, onRecovery }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [unlockAttempts, setUnlockAttempts] = useState(0);
  const [unlockLockedUntil, setUnlockLockedUntil] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THROTTLE_KEY);
      if (stored) {
        const { attempts, lockedUntil } = JSON.parse(stored);
        if (Number.isFinite(attempts) && attempts >= 0) setUnlockAttempts(attempts);
        if (Number.isFinite(lockedUntil) && lockedUntil >= 0) setUnlockLockedUntil(lockedUntil);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!recoveryCode) return;
    const timer = setTimeout(() => setRecoveryCode(null), RECOVERY_DISPLAY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [recoveryCode]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 12) { setError("Passphrase must be at least 12 characters"); return; }
    if (passphrase !== confirm) { setError("Passphrases do not match"); return; }
    setLoading(true);
    try {
      const code = await onSetup!(passphrase);
      setRecoveryCode(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const now = Date.now();
    if (unlockLockedUntil > now) {
      const secs = Math.ceil((unlockLockedUntil - now) / 1000);
      setError(`Too many attempts. Try again in ${secs}s`);
      return;
    }
    setLoading(true);
    try {
      await onUnlock!(passphrase);
      setUnlockAttempts(0);
      localStorage.removeItem(THROTTLE_KEY);
    } catch {
      const next = unlockAttempts + 1;
      setUnlockAttempts(next);
      if (next >= 5) {
        const delayMs = Math.min(Math.pow(2, next - 5) * 30_000, 600_000);
        const lockedUntil = Date.now() + delayMs;
        setUnlockLockedUntil(lockedUntil);
        localStorage.setItem(THROTTLE_KEY, JSON.stringify({ attempts: next, lockedUntil }));
        setError(`Too many attempts. Try again in ${Math.ceil(delayMs / 1000)}s`);
      } else {
        localStorage.setItem(THROTTLE_KEY, JSON.stringify({ attempts: next, lockedUntil: 0 }));
        setError("Incorrect passphrase");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onRecovery!(recoveryInput.trim());
    } catch {
      setError("Invalid recovery code");
    } finally {
      setLoading(false);
    }
  };

  const copyRecovery = async () => {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select and copy the code manually.");
    }
  };

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: "#080d14",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1.5rem",
    fontFamily: "var(--font-space-mono), monospace",
    position: "relative",
  };

  const panel: React.CSSProperties = {
    width: "100%", maxWidth: "440px",
    border: "1px solid rgba(0,255,140,0.12)",
    background: "rgba(8,13,20,0.98)",
    padding: "2rem",
  };

  if (recoveryCode) {
    return (
      <div className={`${spaceMono.variable} ${syne.variable}`} style={shell}>
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.18em", color: "#00ff8c" }}>◈ TACITUS</div>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", color: "#2d4050", marginTop: "0.3rem" }}>SAVE RECOVERY CODE</div>
          </div>
          <div style={panel}>
            <p style={{ fontSize: "0.72rem", lineHeight: 1.7, color: "#4a6070", marginBottom: "1.5rem", margin: "0 0 1.5rem" }}>
              This code is shown <span style={{ color: "#c8d4e0" }}>once</span>. Store it in a password manager. Without it, a forgotten passphrase means permanent loss.
            </p>
            <div style={{
              background: "#050a10",
              border: "1px solid rgba(0,255,140,0.15)",
              padding: "1rem",
              marginBottom: "1rem",
            }}>
              <code style={{ fontSize: "0.72rem", lineHeight: 1.6, color: "#00ff8c", wordBreak: "break-all", display: "block" }}>
                {recoveryCode}
              </code>
            </div>
            <button
              onClick={copyRecovery}
              style={{
                width: "100%", padding: "0.7rem", marginBottom: "1rem",
                background: copied ? "rgba(0,255,140,0.1)" : "#00ff8c",
                color: copied ? "#00ff8c" : "#080d14",
                border: copied ? "1px solid rgba(0,255,140,0.3)" : "none",
                fontSize: "0.65rem", letterSpacing: "0.14em", fontFamily: "inherit", fontWeight: 700,
                cursor: "pointer",
                clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
              }}
            >
              {copied ? "✓ COPIED" : "COPY RECOVERY CODE"}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", marginBottom: "1rem" }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                style={{ accentColor: "#00ff8c" }}
              />
              <span style={{ fontSize: "0.65rem", color: "#4a6070", letterSpacing: "0.04em" }}>
                I have saved this in a password manager
              </span>
            </label>
            <button
              disabled={!acknowledged}
              onClick={() => setRecoveryCode(null)}
              style={{
                width: "100%", padding: "0.7rem",
                background: "transparent",
                color: acknowledged ? "#c8d4e0" : "#2d4050",
                border: "1px solid rgba(0,255,140,0.1)",
                fontSize: "0.65rem", letterSpacing: "0.1em", fontFamily: "inherit",
                cursor: acknowledged ? "pointer" : "not-allowed",
              }}
            >
              DONE — CLEAR AND CONTINUE
            </button>
            <p style={{ textAlign: "center", fontSize: "0.58rem", color: "#1a2a36", marginTop: "1rem", letterSpacing: "0.1em" }}>
              AUTO-CLEARS IN 5 MIN
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${spaceMono.variable} ${syne.variable}`} style={shell}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.18em", color: "#00ff8c" }}>◈ TACITUS</div>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", color: "#2d4050", marginTop: "0.3rem" }}>
            {mode === "setup" ? "INITIALIZE ENCRYPTION" : "DECRYPT SESSION"}
          </div>
        </div>
        <div style={panel}>
          <p style={{ fontSize: "0.72rem", lineHeight: 1.7, color: "#3a5060", marginBottom: "1.5rem", margin: "0 0 1.5rem" }}>
            {mode === "setup"
              ? "Your passphrase derives the encryption key locally. It never leaves this device."
              : "Enter your passphrase to decrypt your messages."}
          </p>

          {!showRecovery ? (
            <form onSubmit={mode === "setup" ? handleSetup : handleUnlock} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <div style={labelStyle}>PASSPHRASE</div>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "rgba(0,255,140,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(0,255,140,0.1)"}
                  placeholder={mode === "setup" ? "min. 12 characters" : "············"}
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  required
                />
              </div>
              {mode === "setup" && (
                <div>
                  <div style={labelStyle}>CONFIRM PASSPHRASE</div>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = "rgba(0,255,140,0.4)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(0,255,140,0.1)"}
                    placeholder="repeat passphrase"
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}
              {error && <div style={{ fontSize: "0.68rem", color: "#ff4455", letterSpacing: "0.04em" }}>✕ {error}</div>}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "0.75rem",
                  background: loading ? "rgba(0,255,140,0.08)" : "#00ff8c",
                  color: loading ? "#00ff8c" : "#080d14",
                  border: loading ? "1px solid rgba(0,255,140,0.2)" : "none",
                  fontSize: "0.68rem", letterSpacing: "0.14em", fontFamily: "inherit", fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                  marginTop: "0.25rem",
                }}
              >
                {loading ? "DERIVING KEY…" : mode === "setup" ? "SET PASSPHRASE" : "UNLOCK"}
              </button>
              {mode === "unlock" && (
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  style={{
                    background: "none", border: "none", fontFamily: "inherit",
                    fontSize: "0.62rem", letterSpacing: "0.08em", color: "#2d4050",
                    cursor: "pointer", transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#4a6070"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#2d4050"}
                >
                  use recovery code instead
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleRecovery} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <div style={labelStyle}>RECOVERY CODE</div>
                <textarea
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.6, color: "#00ff8c" }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(0,255,140,0.4)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(0,255,140,0.1)"}
                  placeholder="paste recovery code…"
                  rows={3}
                />
              </div>
              {error && <div style={{ fontSize: "0.68rem", color: "#ff4455" }}>✕ {error}</div>}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "0.75rem",
                  background: "#00ff8c", color: "#080d14",
                  border: "none",
                  fontSize: "0.68rem", letterSpacing: "0.14em", fontFamily: "inherit", fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "RECOVERING…" : "RECOVER ACCESS"}
              </button>
              <button
                type="button"
                onClick={() => { setShowRecovery(false); setRecoveryInput(""); }}
                style={{
                  background: "none", border: "none", fontFamily: "inherit",
                  fontSize: "0.62rem", letterSpacing: "0.08em", color: "#2d4050",
                  cursor: "pointer", transition: "color 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#4a6070"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#2d4050"}
              >
                ← back to passphrase
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
