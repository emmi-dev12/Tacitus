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
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export function AliasCard({ alias, unreadCount, selected, onSelect, cryptoKey }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const deleteAlias = useMutation(api.aliases.deleteAlias);
  const setActiveStatus = useMutation(api.aliases.setActiveStatus);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(alias.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    if (!cryptoKey) return;
    setDeleting(true);
    try {
      // Decrypt the mail.tm token and delete the remote account first so the
      // mailbox doesn't persist after the user believes they've removed it.
      const token = await decrypt(alias.encryptedMailTmToken, alias.tokenIv, cryptoKey);
      await deleteMailTmAccount(alias.mailTmAccountId, token).catch((err: unknown) => {
        console.error("Failed to delete mail.tm account:", err);
        // Surface to user — mailbox may continue receiving email
        setDeleteWarning("Mail.tm mailbox could not be deleted remotely. Your local alias record has been removed, but the remote mailbox may persist.");
      });
      await deleteAlias({ aliasId: alias._id });
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
      className={`group relative cursor-pointer rounded-xl border p-4 transition-all ${
        selected
          ? "border-emerald-600/60 bg-emerald-950/20"
          : "border-[#1E293B] bg-[#0D1117] hover:border-[#334155]"
      }`}
    >
      {/* Remote delete warning */}
      {deleteWarning && (
        <div className="mb-2 rounded-md bg-yellow-950/40 border border-yellow-800/40 px-3 py-2 text-[10px] text-yellow-400">
          {deleteWarning}
        </div>
      )}

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute right-3 top-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
          {unreadCount}
        </span>
      )}

      <div className="mb-2 flex items-start justify-between pr-6">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-400">{alias.label}</p>
          <p className="break-all font-mono text-sm text-white">{alias.address}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* TTL badge */}
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
          isExpired ? "bg-red-950 text-red-400" : "bg-slate-800 text-slate-400"
        }`}>
          {ttlStr}
        </span>

        {/* Active toggle */}
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
          alias.activeStatus ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-500"
        }`}>
          {alias.activeStatus ? "active" : "paused"}
        </span>

        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={copy}
            title="Copy address"
            className="rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {copied ? "✓" : "copy"}
          </button>
          <button
            onClick={toggleActive}
            title={alias.activeStatus ? "Pause" : "Resume"}
            className="rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {alias.activeStatus ? "pause" : "resume"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
            className={`rounded px-2 py-1 text-[10px] transition ${
              confirming
                ? "bg-red-900 text-red-300 hover:bg-red-800"
                : "text-slate-500 hover:bg-slate-800 hover:text-red-400"
            } disabled:opacity-50`}
          >
            {deleting ? "deleting…" : confirming ? "confirm?" : "delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
