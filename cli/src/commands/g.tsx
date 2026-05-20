import { Command } from "@oclif/core";
import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { getClient } from "../lib/convex.js";
import { loadConfig } from "../lib/config.js";
import { deriveKey, encrypt, verifySentinel } from "../lib/crypto.js";

async function mailtmFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.mail.tm${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(opts.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`mail.tm ${path} → ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("mail.tm response too large");
  return JSON.parse(new TextDecoder().decode(buf)) as T;
}

const DOMAIN_RE = /^[a-z0-9][a-z0-9.\-]{1,253}\.[a-z]{2,}$/i;

async function generateMailTmAlias(prefix?: string): Promise<{ address: string; accountId: string; token: string; password: string }> {
  const domains = await mailtmFetch<{ "hydra:member": Array<{ domain: string; isActive: boolean }> }>("/domains");
  const active = domains["hydra:member"].filter(
    (d: { domain: string; isActive: boolean }) =>
      d.isActive && typeof d.domain === "string" && DOMAIN_RE.test(d.domain),
  );
  if (!active.length) throw new Error("No active mail.tm domains");

  const randBytes = crypto.getRandomValues(new Uint8Array(17));
  // Rejection sampling — eliminates modulo bias in domain selection
  const domainCount = active.length;
  const threshold = 256 - (256 % domainCount);
  let domainByte = randBytes[0];
  while (domainByte >= threshold) {
    domainByte = crypto.getRandomValues(new Uint8Array(1))[0];
  }
  const domain = active[domainByte % domainCount];

  // 32-char base32 alphabet: 256 % 32 === 0 — no modulo bias; 16 bytes = 80-bit entropy
  const chars = "abcdefghijklmnopqrstuvwxyz234567";
  const rand = Array.from(randBytes.slice(1), (b: number) => chars[b % chars.length]).join("");
  const local = prefix ? `${prefix.toLowerCase().replace(/[^a-z0-9]/g, "")}-${rand}` : rand;
  const address = `${local}@${domain.domain}`;

  const password = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("hex");

  await mailtmFetch("/accounts", { method: "POST", body: JSON.stringify({ address, password }) });

  const { token } = await mailtmFetch<{ token: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });

  const { id } = await mailtmFetch<{ id: string }>("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  return { address, accountId: id, token, password };
}

function CreateAliasUI() {
  const { exit } = useApp();
  const [step, setStep] = useState<"label" | "prefix" | "passphrase" | "creating" | "done" | "error">("label");
  const [label, setLabel] = useState("");
  const [prefix, setPrefix] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [result, setResult] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useInput((_, key) => {
    if (key.ctrl && key.name === "c") exit();
  });

  const create = async (pp: string) => {
    setStep("creating");
    try {
      const config = await loadConfig();
      if (!config) throw new Error("Not logged in. Run: tac login");

      const client = await getClient();
      const profile = await client.query("users:getProfile", {}) as {
        pbkdf2Salt: string;
        encryptedSentinel: string;
        sentinelIv: string;
      } | null;
      if (!profile) throw new Error("No encryption profile found. Set up via web UI first.");

      const key = await deriveKey(pp, profile.pbkdf2Salt);
      if (!verifySentinel(profile.encryptedSentinel, profile.sentinelIv, key)) {
        throw new Error("Incorrect passphrase");
      }
      const { address, accountId, token, password } = await generateMailTmAlias(prefix || undefined);
      const encToken = encrypt(token, key);
      const encPassword = encrypt(password, key);

      await client.mutation("aliases:createAlias", {
        address,
        label: label || address.split("@")[0],
        mailTmAccountId: accountId,
        encryptedMailTmToken: encToken.ciphertext,
        encryptedMailTmPassword: encPassword.ciphertext,
        tokenIv: encToken.iv,
        passwordIv: encPassword.iv,
      });

      setResult(address);
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  };

  if (step === "label") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">◆ Tacitus — New Alias</Text>
        <Box>
          <Text color="gray">Label: </Text>
          <TextInput
            value={label}
            onChange={setLabel}
            onSubmit={() => setStep("prefix")}
            placeholder="e.g. Netflix signup"
          />
        </Box>
        <Text color="gray" dimColor>Press Enter to continue</Text>
      </Box>
    );
  }

  if (step === "prefix") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">◆ Tacitus — New Alias</Text>
        <Text>Label: <Text color="white">{label || "(auto)"}</Text></Text>
        <Box>
          <Text color="gray">Custom prefix (optional): </Text>
          <TextInput
            value={prefix}
            onChange={setPrefix}
            onSubmit={() => setStep("passphrase")}
            placeholder="e.g. netflix"
          />
        </Box>
      </Box>
    );
  }

  if (step === "passphrase") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">◆ Tacitus — New Alias</Text>
        <Box>
          <Text color="gray">Encryption passphrase: </Text>
          <TextInput
            value={passphrase}
            onChange={setPassphrase}
            onSubmit={create}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  if (step === "creating") {
    return <Text color="yellow">Creating alias…</Text>;
  }

  if (step === "done") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">✓ Alias created</Text>
        <Text color="white">{result}</Text>
        <Text color="gray" dimColor>Copied to your inbox. Polling starts in web UI.</Text>
      </Box>
    );
  }

  return <Text color="red">Error: {errorMsg}</Text>;
}

export default class G extends Command {
  static description = "Create a new disposable alias";
  static aliases = ["generate"];

  async run() {
    const { waitUntilExit } = render(<CreateAliasUI />);
    await waitUntilExit();
  }
}
