import { Command } from "@oclif/core";
import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { getClient } from "../lib/convex.js";
import { loadConfig } from "../lib/config.js";
import { deriveKey, encrypt } from "../lib/crypto.js";

// Inline the mail.tm API call (no browser deps)
async function generateMailTmAlias(prefix?: string): Promise<{ address: string; accountId: string; token: string; password: string }> {
  const domainsRes = await fetch("https://api.mail.tm/domains", {
    headers: { Accept: "application/json" },
  });
  const domains = await domainsRes.json() as { "hydra:member": Array<{ domain: string; isActive: boolean }> };
  const active = domains["hydra:member"].filter((d: { isActive: boolean }) => d.isActive);
  if (!active.length) throw new Error("No active mail.tm domains");
  const randBytes = crypto.getRandomValues(new Uint8Array(9));
  const domain = active[randBytes[0] % active.length];

  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const rand = Array.from(randBytes.slice(1), (b: number) => chars[b % chars.length]).join("");
  const local = prefix ? `${prefix.toLowerCase().replace(/[^a-z0-9]/g, "")}-${rand}` : rand;
  const address = `${local}@${domain.domain}`;

  const password = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("hex");

  await fetch("https://api.mail.tm/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ address, password }),
  });

  const tokenRes = await fetch("https://api.mail.tm/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ address, password }),
  });
  const { token } = await tokenRes.json() as { token: string };

  const meRes = await fetch("https://api.mail.tm/me", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const { id } = await meRes.json() as { id: string };

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
      if (!config) throw new Error("Not logged in. Run: ghost login");

      const client = await getClient();
      const saltRes = await client.query("users:getSalt", {});
      if (!saltRes) throw new Error("No encryption salt found. Set up via web UI first.");

      const key = await deriveKey(pp, saltRes as string);
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
        <Text color="green">◆ GhostMail — New Alias</Text>
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
        <Text color="green">◆ GhostMail — New Alias</Text>
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
        <Text color="green">◆ GhostMail — New Alias</Text>
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
