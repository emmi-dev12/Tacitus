import { Command } from "@oclif/core";
import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { saveConfig } from "../lib/config.js";
import { ConvexHttpClient } from "convex/browser";

function LoginUI() {
  const { exit } = useApp();
  const [step, setStep] = useState<"url" | "email" | "password" | "saving" | "done" | "error">("url");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useInput((_, key) => {
    if (key.ctrl && key.name === "c") exit();
  });

  const doLogin = async (pw: string) => {
    setStep("saving");
    try {
      // Validate Convex URL — strict hostname check, no substring bypass
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new Error("Invalid URL"); }
      if (parsed.protocol !== "https:") throw new Error("URL must use https://");
      if (!parsed.hostname.endsWith(".convex.cloud")) throw new Error("URL must be a *.convex.cloud hostname");
      if (parsed.pathname !== "/" && parsed.pathname !== "") throw new Error("URL must not have a path");

      const client = new ConvexHttpClient(url);
      // Attempt Convex Auth password sign-in
      const result = await client.action("auth:signIn", {
        provider: "password",
        params: { email: email.trim().toLowerCase(), password: pw, flow: "signIn" },
      }) as { token?: string };

      if (!result?.token) throw new Error("Sign-in failed — check credentials");

      await saveConfig({ convexUrl: url, authToken: result.token });
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  };

  if (step === "url") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">◆ GhostMail Login</Text>
        <Box>
          <Text color="gray">Convex URL: </Text>
          <TextInput
            value={url}
            onChange={setUrl}
            onSubmit={() => setStep("email")}
            placeholder="https://xxx.convex.cloud"
          />
        </Box>
      </Box>
    );
  }

  if (step === "email") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">◆ GhostMail Login</Text>
        <Box>
          <Text color="gray">Email: </Text>
          <TextInput
            value={email}
            onChange={setEmail}
            onSubmit={() => setStep("password")}
          />
        </Box>
      </Box>
    );
  }

  if (step === "password") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">◆ GhostMail Login</Text>
        <Box>
          <Text color="gray">Password: </Text>
          <TextInput
            value={password}
            onChange={setPassword}
            onSubmit={doLogin}
            mask="*"
          />
        </Box>
      </Box>
    );
  }

  if (step === "saving") return <Text color="yellow">Signing in…</Text>;

  if (step === "done") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">✓ Logged in and credentials saved</Text>
        <Text color="gray" dimColor>Run: ghost g  to create your first alias</Text>
      </Box>
    );
  }

  return <Text color="red">Error: {errorMsg}</Text>;
}

export default class Login extends Command {
  static description = "Log in to your GhostMail Convex backend";

  async run() {
    const { waitUntilExit } = render(<LoginUI />);
    await waitUntilExit();
  }
}
