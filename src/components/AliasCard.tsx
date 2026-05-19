"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Props {
  alias: {
    _id: Id<"aliases">;
    address: string;
    label: string;
    activeStatus: boolean;
    expiresAt: number;
  };
  unreadCount: number;
  selected: boolean;
  onSelect: () => void;
}

function formatTTL(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export function AliasCard({ alias, unreadCount, selected, onSelect }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
    await deleteAlias({ aliasId: alias._id });
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
            title="Delete"
            className={`rounded px-2 py-1 text-[10px] transition ${
              confirming
                ? "bg-red-900 text-red-300 hover:bg-red-800"
                : "text-slate-500 hover:bg-slate-800 hover:text-red-400"
            }`}
          >
            {confirming ? "confirm?" : "delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
