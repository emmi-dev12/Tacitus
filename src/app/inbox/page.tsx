"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEncryptionKey } from "@/hooks/useEncryptionKey";
import { useMailPoller } from "@/hooks/useMailPoller";
import { PassphraseSetup } from "@/components/PassphraseSetup";
import { AliasCard } from "@/components/AliasCard";
import { MessageList } from "@/components/MessageList";
import { MessageViewer } from "@/components/MessageViewer";
import { CreateAliasModal } from "@/components/CreateAliasModal";

interface DecryptedMessage {
  id: Id<"messages">;
  from: string;
  subject: string;
  bodyPlain: string;
  bodyHtml: string;
  receivedAt: number;
  read: boolean;
}

export default function InboxPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const { status, setup, unlock, unlockWithRecovery, getKey, logout } = useEncryptionKey();

  const aliases = useQuery(api.aliases.listAliases) ?? [];
  const [selectedAliasId, setSelectedAliasId] = useState<Id<"aliases"> | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<DecryptedMessage | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const selectedAlias = aliases.find((a) => a._id === selectedAliasId) ?? null;
  const messages = useQuery(
    api.messages.listMessages,
    selectedAliasId ? { aliasId: selectedAliasId } : "skip",
  ) ?? [];

  // Unread counts per alias
  const allMessages = useQuery(
    api.messages.listMessages,
    selectedAliasId ? { aliasId: selectedAliasId } : "skip",
  ) ?? [];
  const unreadCount = allMessages.filter((m) => !m.read).length;

  // Poll mail.tm for new messages
  useMailPoller(
    aliases.map((a) => ({
      _id: a._id,
      encryptedMailTmToken: a.encryptedMailTmToken,
      tokenIv: a.tokenIv,
    })),
    status === "unlocked" ? getKey : () => { throw new Error("locked"); },
    status === "unlocked",
  );

  // ── Auth guard ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F172A]">
        <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace("/auth");
    return null;
  }

  // ── Passphrase gate ─────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F172A]">
        <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    );
  }

  if (status === "needs_setup") {
    return (
      <PassphraseSetup
        mode="setup"
        onSetup={setup}
      />
    );
  }

  if (status === "needs_unlock") {
    return (
      <PassphraseSetup
        mode="unlock"
        onUnlock={unlock}
        onRecovery={unlockWithRecovery}
      />
    );
  }

  const cryptoKey = getKey();

  return (
    <div className="flex h-screen flex-col bg-[#0F172A]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[#1E293B] px-6 py-3">
        <span className="text-sm font-bold tracking-tight text-white">
          Ghost<span className="text-emerald-400">Mail</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
          >
            + New alias
          </button>
          <button
            onClick={() => { logout(); signOut().then(() => router.replace("/auth")); }}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main bento grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Alias sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-[#1E293B]">
          <div className="border-b border-[#1E293B] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Aliases ({aliases.length})
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {aliases.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-xs text-slate-600">No aliases yet</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-lg border border-dashed border-[#1E293B] px-4 py-2 text-xs text-slate-500 hover:border-emerald-600/40 hover:text-slate-300"
                >
                  Create your first alias
                </button>
              </div>
            ) : (
              aliases.map((alias) => (
                <AliasCard
                  key={alias._id}
                  alias={alias}
                  unreadCount={selectedAliasId === alias._id ? unreadCount : 0}
                  selected={selectedAliasId === alias._id}
                  onSelect={() => {
                    setSelectedAliasId(alias._id);
                    setSelectedMessage(null);
                  }}
                />
              ))
            )}
          </div>
        </aside>

        {/* Message list */}
        <section className="flex w-64 shrink-0 flex-col border-r border-[#1E293B]">
          <div className="border-b border-[#1E293B] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {selectedAlias ? selectedAlias.label : "Select an alias"}
            </p>
          </div>
          {selectedAliasId ? (
            <MessageList
              messages={messages}
              cryptoKey={cryptoKey}
              onSelect={setSelectedMessage}
              selectedId={selectedMessage?.id}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-slate-600">No alias selected</p>
            </div>
          )}
        </section>

        {/* Message viewer */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {selectedMessage ? (
            <MessageViewer
              message={selectedMessage}
              onDelete={() => setSelectedMessage(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-slate-600">Select a message</p>
            </div>
          )}
        </main>
      </div>

      {showCreate && (
        <CreateAliasModal
          cryptoKey={cryptoKey}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
