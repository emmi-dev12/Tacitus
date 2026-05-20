"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { encrypt } from "@/lib/crypto";
import { generateAddress, createAccount } from "@/lib/mailtm";

interface Props {
  cryptoKey: CryptoKey;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#050a10",
  border: "1px solid rgba(0,255,140,0.1)",
  padding: "0.6rem 0.75rem",
  fontSize: "0.78rem",
  fontFamily: "var(--font-space-mono), monospace",
  color: "#c8d4e0",
  outline: "none",
};

export function CreateAliasModal({ cryptoKey, onClose }: Props) {
  const [label, setLabel] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createAlias = useMutation(api.aliases.createAlias);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const password = Array.from(
        crypto.getRandomValues(new Uint8Array(24)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");

      const address = await generateAddress(customPrefix || undefined);
      const account = await createAccount(address, password);

      const [encToken, encPassword] = await Promise.all([
        encrypt(account.token, cryptoKey),
        encrypt(password, cryptoKey),
      ]);

      await createAlias({
        address: account.address,
        label: label || account.address.split("@")[0],
        mailTmAccountId: account.id,
        encryptedMailTmToken: encToken.ciphertext,
        encryptedMailTmPassword: encPassword.ciphertext,
        tokenIv: encToken.iv,
        passwordIv: encPassword.iv,
      });

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create alias");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(8px)",
      padding: "1.5rem",
      fontFamily: "var(--font-space-mono), monospace",
    }}>
      <div style={{
        width: "100%", maxWidth: "420px",
        background: "#080d14",
        border: "1px solid rgba(0,255,140,0.15)",
        padding: "1.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "#5a8070", marginBottom: "0.25rem" }}>NEW ALIAS</div>
            <div style={{ fontSize: "0.9rem", fontFamily: "var(--font-syne), sans-serif", fontWeight: 700, color: "#c8d4e0" }}>
              Create alias
            </div>
          </div>
          <button
            onClick={loading ? undefined : onClose}
            disabled={loading}
            style={{ background: "none", border: "none", color: loading ? "#2d4050" : "#5a8070", fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.color = "#c8d4e0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = loading ? "#2d4050" : "#5a8070"; }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: "#5a8070", marginBottom: "0.4rem" }}>
              LABEL
            </div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = "rgba(0,255,140,0.4)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(0,255,140,0.1)"}
              placeholder="e.g. netflix-signup"
              maxLength={64}
            />
          </div>

          <div>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: "#5a8070", marginBottom: "0.4rem" }}>
              CUSTOM PREFIX <span style={{ opacity: 0.5 }}>(OPTIONAL)</span>
            </div>
            <input
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = "rgba(0,255,140,0.4)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(0,255,140,0.1)"}
              placeholder="my-prefix"
              maxLength={32}
              pattern="[a-zA-Z0-9\-_]*"
            />
            <div style={{ fontSize: "0.65rem", color: "#4a7060", marginTop: "0.35rem", letterSpacing: "0.06em" }}>
              alphanumeric + hyphens · random suffix appended
            </div>
          </div>

          {error && (
            <div style={{ fontSize: "0.68rem", color: "#ff4455", letterSpacing: "0.04em" }}>✕ {error}</div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.25rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1, padding: "0.65rem",
                background: "none",
                border: "1px solid rgba(0,255,140,0.1)",
                color: "#5a8070", fontSize: "0.65rem", letterSpacing: "0.1em",
                fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#c8d4e0"; e.currentTarget.style.borderColor = "rgba(0,255,140,0.25)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#5a8070"; e.currentTarget.style.borderColor = "rgba(0,255,140,0.1)"; }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: "0.65rem",
                background: loading ? "rgba(0,255,140,0.08)" : "#00ff8c",
                color: loading ? "#00ff8c" : "#080d14",
                border: loading ? "1px solid rgba(0,255,140,0.2)" : "none",
                fontSize: "0.65rem", letterSpacing: "0.1em", fontWeight: 700,
                fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer",
                clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                transition: "all 0.15s",
              }}
            >
              {loading ? "CREATING…" : "CREATE ALIAS"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
