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
      // Generate a strong random password for the mail.tm account
      const password = Array.from(
        crypto.getRandomValues(new Uint8Array(24)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");

      const address = await generateAddress(customPrefix || undefined);
      const account = await createAccount(address, password);

      // Encrypt both token and password so token can be refreshed if it expires
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">New alias</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-[#1E293B] bg-[#0D1117] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-600"
              placeholder="e.g. Netflix signup"
              maxLength={64}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">
              Custom prefix{" "}
              <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value)}
              className="w-full rounded-lg border border-[#1E293B] bg-[#0D1117] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-600 font-mono"
              placeholder="netflix-signup"
              maxLength={32}
              pattern="[a-zA-Z0-9\-_]*"
            />
            <p className="text-[10px] text-slate-600">
              Alphanumeric + hyphens only. A random suffix is appended.
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#1E293B] px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create alias"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
