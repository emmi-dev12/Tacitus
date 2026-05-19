"use client";

import { useState, useEffect, useCallback } from "react";

const RECOVERY_DISPLAY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface Props {
  mode: "setup" | "unlock";
  onSetup?: (passphrase: string) => Promise<string>; // returns recovery code
  onUnlock?: (passphrase: string) => Promise<void>;
  onRecovery?: (code: string) => Promise<void>;
}

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

  // Auto-clear recovery code from DOM after timeout
  useEffect(() => {
    if (!recoveryCode) return;
    const timer = setTimeout(() => setRecoveryCode(null), RECOVERY_DISPLAY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [recoveryCode]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 12) {
      setError("Passphrase must be at least 12 characters");
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match");
      return;
    }
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
    setLoading(true);
    try {
      await onUnlock!(passphrase);
    } catch {
      setError("Incorrect passphrase");
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

  const copyRecovery = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show recovery code after setup
  if (recoveryCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#1E293B] bg-[#0F172A] p-8">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-white">Save your recovery code</h1>
            <p className="text-sm text-slate-400">
              This is shown once. If you forget your passphrase, this code is the only way to recover your messages.
            </p>
          </div>
          <div className="rounded-lg border border-[#1E293B] bg-[#0D1117] p-4">
            <code className="break-all text-xs text-emerald-400">{recoveryCode}</code>
          </div>
          <button
            onClick={copyRecovery}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            {copied ? "Copied!" : "Copy recovery code"}
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 accent-emerald-500"
            />
            <span className="text-xs text-slate-400">
              I have saved this code in a password manager
            </span>
          </label>
          <button
            disabled={!acknowledged}
            onClick={() => setRecoveryCode(null)}
            className="w-full rounded-lg border border-[#1E293B] px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-40"
          >
            Done — clear and continue
          </button>
          <p className="text-center text-[10px] text-slate-600">
            This code auto-clears in 5 minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#1E293B] bg-[#0F172A] p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-white">
            {mode === "setup" ? "Set your encryption passphrase" : "Unlock your inbox"}
          </h1>
          <p className="text-sm text-slate-400">
            {mode === "setup"
              ? "This passphrase encrypts your messages locally. It never leaves your device."
              : "Enter your passphrase to decrypt your messages."}
          </p>
        </div>

        {!showRecovery ? (
          <form onSubmit={mode === "setup" ? handleSetup : handleUnlock} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Passphrase</label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full rounded-lg border border-[#1E293B] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                placeholder={mode === "setup" ? "At least 12 characters" : "Your passphrase"}
                autoComplete={mode === "setup" ? "new-password" : "current-password"}
                required
              />
            </div>
            {mode === "setup" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Confirm passphrase</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-[#1E293B] bg-[#0D1117] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  placeholder="Repeat passphrase"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "setup" ? "Set passphrase" : "Unlock"}
            </button>
            {mode === "unlock" && (
              <button
                type="button"
                onClick={() => setShowRecovery(true)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
              >
                Use recovery code instead
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleRecovery} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Recovery code</label>
              <textarea
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                className="w-full rounded-lg border border-[#1E293B] bg-[#0D1117] px-3 py-2.5 text-xs text-emerald-400 placeholder-slate-600 outline-none focus:border-emerald-600"
                placeholder="Paste your recovery code"
                rows={3}
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Recovering…" : "Recover access"}
            </button>
            <button
              type="button"
              onClick={() => setShowRecovery(false)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Back to passphrase
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
