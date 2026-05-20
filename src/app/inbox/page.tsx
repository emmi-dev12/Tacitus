"use client";

import { useState, useEffect } from "react";
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
import { spaceMono, syne } from "../landing-fonts";

interface DecryptedMessage {
  id: Id<"messages">;
  from: string;
  subject: string;
  bodyPlain: string;
  bodyHtml: string;
  receivedAt: number;
  read: boolean;
}

const S = {
  shell: {
    display: "flex", flexDirection: "column" as const,
    height: "100vh",
    background: "#080d14",
    color: "#c8d4e0",
    fontFamily: "var(--font-space-mono), monospace",
    overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0.75rem 1.5rem",
    borderBottom: "1px solid rgba(0,255,140,0.08)",
    background: "rgba(8,13,20,0.95)",
    backdropFilter: "blur(12px)",
    flexShrink: 0,
  },
  logo: {
    fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.18em",
    color: "#00ff8c",
    fontFamily: "var(--font-space-mono), monospace",
  },
  headerRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  btnNew: {
    fontSize: "0.65rem", letterSpacing: "0.12em", fontFamily: "inherit",
    color: "#080d14", background: "#00ff8c",
    border: "none", padding: "0.4rem 1rem",
    cursor: "pointer", fontWeight: 700,
    clipPath: "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))",
    transition: "opacity 0.15s",
  },
  btnSignOut: {
    fontSize: "0.65rem", letterSpacing: "0.08em", fontFamily: "inherit",
    color: "#5a7a8a", background: "none", border: "none",
    cursor: "pointer", transition: "color 0.15s",
  },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: {
    width: "272px", flexShrink: 0,
    display: "flex", flexDirection: "column" as const,
    borderRight: "1px solid rgba(0,255,140,0.08)",
  },
  paneHeader: {
    padding: "0.65rem 1rem",
    borderBottom: "1px solid rgba(0,255,140,0.06)",
    fontSize: "0.65rem", letterSpacing: "0.2em", color: "#5a8070",
  },
  midPane: {
    width: "256px", flexShrink: 0,
    display: "flex", flexDirection: "column" as const,
    borderRight: "1px solid rgba(0,255,140,0.08)",
  },
  mainPane: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  empty: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.65rem", letterSpacing: "0.1em", color: "#4a7060",
  },
  spinner: {
    height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#080d14",
  },
};

function Spinner() {
  return (
    <div style={S.spinner}>
      <div style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: "#00ff8c", opacity: 0.7,
        animation: "tacitus-pulse 1.2s ease-in-out infinite",
      }} />
    </div>
  );
}

export default function InboxPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const { status, unlock, unlockWithRecovery, getKey, logout } = useEncryptionKey(isAuthenticated);

  // Only fetch data once fully authenticated and passphrase-unlocked.
  // Passing "skip" before that point ensures zero Convex traffic while unauthenticated.
  const isReady = isAuthenticated && status === "unlocked";
  const aliases = useQuery(api.aliases.listAliases, isReady ? undefined : "skip") ?? [];
  const [selectedAliasId, setSelectedAliasId] = useState<Id<"aliases"> | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<DecryptedMessage | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const selectedAlias = aliases.find((a) => a._id === selectedAliasId) ?? null;
  const messages = useQuery(
    api.messages.listMessages,
    isReady && selectedAliasId ? { aliasId: selectedAliasId } : "skip",
  ) ?? [];

  const unreadCount = messages.filter((m) => !m.read).length;

  // Only poll when fully ready — prevents poller from running during auth or unlock phases.
  useMailPoller(
    aliases.map((a) => ({
      _id: a._id,
      encryptedMailTmToken: a.encryptedMailTmToken,
      tokenIv: a.tokenIv,
    })),
    isReady ? getKey : () => { throw new Error("locked"); },
    isReady,
  );

  // In static export mode, there is no server-side auth enforcement — middleware
  // does not run. This client-side check is the only gate protecting this route.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/landing");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || status === "loading" || !isAuthenticated) return <Spinner />

  if (status === "needs_unlock") {
    return <PassphraseSetup onUnlock={unlock} onRecovery={unlockWithRecovery} />;
  }

  const cryptoKey = getKey()!;

  return (
    <>
      <div className={`${spaceMono.variable} ${syne.variable}`} style={S.shell}>
        <header style={S.header}>
          <span style={S.logo}>◈ TACITUS</span>
          <div style={S.headerRight}>
            <button
              style={S.btnNew}
              onClick={() => setShowCreate(true)}
            >
              + NEW ALIAS
            </button>
            <button
              style={S.btnSignOut}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c8d4e0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#5a7a8a")}
              onClick={async () => {
              logout();
              try { await signOut(); } finally { router.replace("/landing"); }
            }}
            >
              sign out
            </button>
          </div>
        </header>

        <div style={S.body}>
          {/* Alias sidebar */}
          <aside style={S.sidebar}>
            <div style={S.paneHeader}>ALIASES ({aliases.length})</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
              {aliases.length === 0 ? (
                <div style={{ ...S.empty, flexDirection: "column", gap: "1rem" }}>
                  <span>no aliases</span>
                  <button
                    onClick={() => setShowCreate(true)}
                    style={{
                      fontSize: "0.68rem", letterSpacing: "0.1em", fontFamily: "inherit",
                      color: "#5a8070", background: "none",
                      border: "1px dashed rgba(0,255,140,0.2)", padding: "0.5rem 1rem",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#00ff8c"; e.currentTarget.style.borderColor = "rgba(0,255,140,0.5)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#5a8070"; e.currentTarget.style.borderColor = "rgba(0,255,140,0.2)"; }}
                  >
                    create first alias
                  </button>
                </div>
              ) : (
                aliases.map((alias) => (
                  <AliasCard
                    key={alias._id}
                    alias={alias}
                    unreadCount={selectedAliasId === alias._id ? unreadCount : 0}
                    selected={selectedAliasId === alias._id}
                    onSelect={() => { setSelectedAliasId(alias._id); setSelectedMessage(null); }}
                    cryptoKey={cryptoKey}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Message list */}
          <section style={S.midPane}>
            <div style={S.paneHeader}>
              {selectedAlias ? selectedAlias.label.toUpperCase() : "SELECT ALIAS"}
            </div>
            {selectedAliasId ? (
              <MessageList
                messages={messages}
                cryptoKey={cryptoKey}
                onSelect={setSelectedMessage}
                selectedId={selectedMessage?.id}
              />
            ) : (
              <div style={S.empty}>—</div>
            )}
          </section>

          {/* Message viewer */}
          <main style={S.mainPane}>
            {selectedMessage ? (
              <MessageViewer message={selectedMessage} onDelete={() => setSelectedMessage(null)} />
            ) : (
              <div style={S.empty}>select a message</div>
            )}
          </main>
        </div>

        {showCreate && (
          <CreateAliasModal cryptoKey={cryptoKey} onClose={() => setShowCreate(false)} />
        )}
      </div>
    </>
  );
}
