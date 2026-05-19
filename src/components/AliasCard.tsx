"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { decrypt } from "@/lib/crypto";
import { deleteMailTmAccount } from "@/lib/mailtm";

interface Props {
  alias: {
    _id: Id<"aliases">;
    address: string;
    label: string;
    activeStatus: boolean;
    expiresAt: number;
    mailTmAccountId: string;
    encryptedMailTmToken: string;
    tokenIv: string;
  };
  unreadCount: number;
  selected: boolean;
  onSelect: () => void;
  cryptoKey: CryptoKey | null;
}

function formatTTL(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h left`;
}

export function AliasCard({ alias, unreadCount, selected, onSelect, cryptoKey }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const deleteAlias = useMutation(api.aliases.deleteAlias);
  const setActiveStatus = useMutation(api.aliases.setActiveStatus);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(alias.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied — silently ignore; user can select manually
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); setDeleteWarning(null); return; }
    if (!cryptoKey) return;
    setDeleting(true);
    try {
      const token = await decrypt(alias.encryptedMailTmToken, alias.tokenIv, cryptoKey);
      // Intentional fallthrough: remote delete failure is non-fatal — we still remove
      // the local record so the user isn't stuck with an alias they can't use.
      await deleteMailTmAccount(alias.mailTmAccountId, token).catch((err: unknown) => {
        console.error("Failed to delete mail.tm account:", err);
        setDeleteWarning("Remote mailbox could not be deleted. Local record removed.");
      });
      try {
        await deleteAlias({ aliasId: alias._id });
        setConfirming(false);
      } catch (err) {
        console.error("Failed to delete alias record:", err);
        setDeleteWarning("Remote mailbox deleted but local record could not be removed. Try again.");
        setConfirming(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await setActiveStatus({ aliasId: alias._id, activeStatus: !alias.activeStatus });
  };

  const ttlStr = formatTTL(alias.expiresAt);
  const isExpired = alias.expiresAt <= Date.now();

  return (
    <div
      onClick={onSelect}
      style={{
        cursor: "pointer",
        border: selected
          ? "1px solid rgba(0,255,140,0.35)"
          : "1px solid rgba(0,255,140,0.06)",
        background: selected ? "rgba(0,255,140,0.04)" : "transparent",
        padding: "0.75rem",
        marginBottom: "0.25rem",
        transition: "all 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = "rgba(0,255,140,0.15)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = "rgba(0,255,140,0.06)";
      }}
      className="group"
    >
      {deleteWarning && (
        <div style={{
          marginBottom: "0.5rem", padding: "0.4rem 0.6rem",
          border: "1px solid rgba(255,180,0,0.2)", background: "rgba(255,180,0,0.05)",
          fontSize: "0.6rem", lineHeight: 1.5, color: "#b08820",
        }}>
          {deleteWarning}
        </div>
      )}

      {unreadCount > 0 && (
        <span style={{
          position: "absolute", top: "0.6rem", right: "0.6rem",
          background: "#00ff8c", color: "#080d14",
          fontSize: "0.58rem", fontWeight: 700,
          padding: "0.1rem 0.4rem",
          minWidth: "18px", textAlign: "center",
        }}>
          {unreadCount}
        </span>
      )}

      <div style={{ marginBottom: "0.5rem", paddingRight: unreadCount > 0 ? "1.5rem" : 0 }}>
        <div style={{ fontSize: "0.58rem", letterSpacing: "0.14em", color: "#2d4050", marginBottom: "0.25rem" }}>
          {alias.label}
        </div>
        <div style={{
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: "0.72rem", color: "#c8d4e0",
          wordBreak: "break-all",
        }}>
          {alias.address}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <span style={{
          fontSize: "0.56rem", letterSpacing: "0.08em", padding: "0.15rem 0.4rem",
          color: isExpired ? "#ff4455" : "#2d4050",
          border: `1px solid ${isExpired ? "rgba(255,68,85,0.25)" : "rgba(0,255,140,0.06)"}`,
        }}>
          {ttlStr}
        </span>
        <span style={{
          fontSize: "0.56rem", letterSpacing: "0.08em", padding: "0.15rem 0.4rem",
          color: alias.activeStatus ? "#00ff8c" : "#2d4050",
          border: `1px solid ${alias.activeStatus ? "rgba(0,255,140,0.2)" : "rgba(0,255,140,0.06)"}`,
        }}>
          {alias.activeStatus ? "active" : "paused"}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem" }} className="opacity-0 group-hover:opacity-100" >
          {[
            { label: copied ? "✓" : "copy", onClick: copy },
            { label: alias.activeStatus ? "pause" : "resume", onClick: toggleActive },
            {
              label: deleting ? "…" : confirming ? "confirm?" : "delete",
              onClick: handleDelete,
              danger: confirming,
            },
          ].map(({ label, onClick, danger }) => (
            <button
              key={label}
              onClick={onClick as (e: React.MouseEvent) => void}
              disabled={deleting}
              style={{
                background: danger ? "rgba(255,68,85,0.1)" : "none",
                border: danger ? "1px solid rgba(255,68,85,0.25)" : "none",
                color: danger ? "#ff6677" : "#2d4050",
                fontSize: "0.58rem", fontFamily: "inherit", letterSpacing: "0.06em",
                padding: "0.2rem 0.4rem", cursor: "pointer",
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) => { if (!danger) e.currentTarget.style.color = "#c8d4e0"; }}
              onMouseLeave={(e) => { if (!danger) e.currentTarget.style.color = "#2d4050"; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
