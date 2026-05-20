import { Command } from "@oclif/core";
import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { getClient } from "../lib/convex.js";
import { loadConfig } from "../lib/config.js";
import { deriveKey, decrypt, verifySentinel } from "../lib/crypto.js";

interface Alias {
  _id: string;
  address: string;
  label: string;
  encryptedMailTmToken: string;
  tokenIv: string;
}

interface EncMsg {
  _id: string;
  encryptedFrom: string;
  ivFrom: string;
  encryptedSubject: string;
  ivSubject: string;
  encryptedBodyPlain: string;
  ivBodyPlain: string;
  encryptedBodyHtml: string;
  ivBodyHtml: string;
  receivedAt: number;
  read: boolean;
}

interface DecMsg {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: number;
  read: boolean;
}

const BIDI_RE = /[‎‏‪-‮⁦-⁩؜]/g;
function stripBidi(s: string): string { return s.replace(BIDI_RE, ""); }

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

function BrowserUI({ passphrase }: { passphrase: string }) {
  const { exit } = useApp();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [messages, setMessages] = useState<DecMsg[]>([]);
  const [aliasIdx, setAliasIdx] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [panel, setPanel] = useState<"aliases" | "messages" | "body">("aliases");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [key, setKey] = useState<Buffer | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const client = await getClient();
        const profile = await client.query("users:getProfile", {}) as {
          pbkdf2Salt: string;
          encryptedSentinel: string;
          sentinelIv: string;
        } | null;
        if (!profile) throw new Error("No profile — set up passphrase in web UI");
        const derivedKey = await deriveKey(passphrase, profile.pbkdf2Salt);
        if (!verifySentinel(profile.encryptedSentinel, profile.sentinelIv, derivedKey)) {
          throw new Error("Incorrect passphrase");
        }
        setKey(derivedKey);
        const data = await client.query("aliases:listAliases", {});
        setAliases((data as Alias[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [passphrase]);

  // Load messages for selected alias
  useEffect(() => {
    if (!key || aliases.length === 0) return;
    const alias = aliases[aliasIdx];
    if (!alias) return;

    getClient().then((client) =>
      client.query("messages:listMessages", { aliasId: alias._id }),
    ).then(async (raw) => {
      const msgs = (raw as EncMsg[]) ?? [];
      const decrypted: DecMsg[] = [];
      for (const m of msgs) {
        try {
          // CLI decrypt() is synchronous (Node.js crypto, not Web Crypto)
          const from = stripBidi(decrypt(m.encryptedFrom, m.ivFrom, key!));
          const subject = stripBidi(decrypt(m.encryptedSubject, m.ivSubject, key!));
          const body = stripBidi(decrypt(m.encryptedBodyPlain, m.ivBodyPlain, key!));
          decrypted.push({ id: m._id, from, subject, body, receivedAt: m.receivedAt, read: m.read });
        } catch { /* skip */ }
      }
      setMessages(decrypted);
      setMsgIdx(0);
    });
  }, [aliasIdx, aliases, key]);

  useInput((input, key) => {
    if (key.ctrl && input === "c") { exit(); return; }

    if (panel === "aliases") {
      if (key.upArrow) setAliasIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) setAliasIdx((i) => Math.min(aliases.length - 1, i + 1));
      if (key.return) setPanel("messages");
      if (input === "q") exit();
    } else if (panel === "messages") {
      if (key.upArrow) setMsgIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) setMsgIdx((i) => Math.min(messages.length - 1, i + 1));
      if (key.return) setPanel("body");
      if (key.escape || input === "b") setPanel("aliases");
    } else if (panel === "body") {
      if (key.escape || input === "b") setPanel("messages");
    }
  });

  if (loading) return <Text color="yellow">Loading…</Text>;
  if (error) return <Text color="red">Error: {error}</Text>;

  const selectedAlias = aliases[aliasIdx];
  const selectedMsg = messages[msgIdx];

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="green" paddingX={1}>
        <Text color="green" bold>Tacitus </Text>
        <Text color="gray">↑↓ navigate · Enter open · b/Esc back · q quit</Text>
      </Box>

      <Box flexDirection="row" gap={1}>
        {/* Aliases panel */}
        <Box flexDirection="column" width={30} borderStyle="single" borderColor={panel === "aliases" ? "green" : "gray"}>
          <Text bold color="gray"> Aliases</Text>
          {aliases.map((a, i) => (
            <Box key={a._id} paddingX={1}>
              <Text
                color={i === aliasIdx ? "green" : "white"}
                bold={i === aliasIdx}
                inverse={i === aliasIdx && panel === "aliases"}
              >
                {a.label.slice(0, 24)}
              </Text>
            </Box>
          ))}
          {aliases.length === 0 && <Text color="gray" dimColor> No aliases</Text>}
        </Box>

        {/* Messages panel */}
        <Box flexDirection="column" width={40} borderStyle="single" borderColor={panel === "messages" ? "green" : "gray"}>
          <Text bold color="gray"> {selectedAlias?.label ?? "Messages"}</Text>
          {messages.map((m, i) => (
            <Box key={m.id} paddingX={1} flexDirection="column">
              <Text
                color={i === msgIdx ? "green" : m.read ? "gray" : "white"}
                bold={!m.read}
                inverse={i === msgIdx && panel === "messages"}
              >
                {m.subject.slice(0, 36)}
              </Text>
            </Box>
          ))}
          {messages.length === 0 && <Text color="gray" dimColor> No messages</Text>}
        </Box>

        {/* Body panel */}
        {panel === "body" && selectedMsg && (
          <Box flexDirection="column" borderStyle="single" borderColor="green" padding={1}>
            <Text bold color="white">{selectedMsg.subject}</Text>
            <Text color="gray">From: {selectedMsg.from}</Text>
            <Text color="gray">{formatTime(selectedMsg.receivedAt)}</Text>
            <Text> </Text>
            <Text color="white" wrap="wrap">{selectedMsg.body.slice(0, 2000)}</Text>
            {selectedMsg.body.length > 2000 && (
              <Text color="yellow" dimColor>
                {`… ${selectedMsg.body.length - 2000} more characters — view full message in web UI`}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function PassphrasePrompt({ onSubmit }: { onSubmit: (pp: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Box gap={1}>
      <Text color="green">◆</Text>
      <Text color="gray">Encryption passphrase:</Text>
      <TextInput value={value} onChange={setValue} onSubmit={onSubmit} mask="*" />
    </Box>
  );
}

export default class M extends Command {
  static description = "Browse your messages in the terminal";
  static aliases = ["messages"];

  async run() {
    let pp = "";
    await new Promise<void>((resolve) => {
      const { unmount } = render(
        <PassphrasePrompt onSubmit={(p) => { pp = p; unmount(); resolve(); }} />,
      );
    });

    const { waitUntilExit } = render(<BrowserUI passphrase={pp} />);
    await waitUntilExit();
    // Best-effort: overwrite the reference (JS strings are immutable — cannot zero memory,
    // but releasing the reference allows GC to collect it sooner)
    pp = "";
  }
}
