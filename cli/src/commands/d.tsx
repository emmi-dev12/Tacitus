import { Command, Args } from "@oclif/core";
import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { getClient } from "../lib/convex.js";

interface Alias {
  _id: string;
  address: string;
  label: string;
}

function DeleteUI({ aliasId }: { aliasId?: string }) {
  const { exit } = useApp();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClient()
      .then((c) => c.query("aliases:listAliases", {}))
      .then((data) => {
        const list = (data as Alias[]) ?? [];
        setAliases(list);
        if (aliasId) {
          const idx = list.findIndex((a) => a._id === aliasId || a.address === aliasId);
          if (idx >= 0) setSelected(idx);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [aliasId]);

  useInput((input, key) => {
    if (key.ctrl && input === "c") { exit(); return; }
    if (done) { exit(); return; }

    if (!confirming) {
      if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelected((i) => Math.min(aliases.length - 1, i + 1));
      if (key.return) setConfirming(true);
      if (input === "q" || key.escape) exit();
    } else {
      if (input === "y" || input === "Y") {
        const alias = aliases[selected];
        getClient()
          .then((c) => c.mutation("aliases:deleteAlias", { aliasId: alias._id }))
          .then(() => setDone(true))
          .catch((e) => setError(e instanceof Error ? e.message : String(e)));
      }
      if (input === "n" || input === "N" || key.escape) {
        setConfirming(false);
      }
    }
  });

  if (loading) return <Text color="yellow">Loading aliases…</Text>;
  if (error) return <Text color="red">Error: {error}</Text>;

  if (done) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">✓ Alias and all associated messages deleted.</Text>
        <Text color="gray" dimColor>Press any key to exit</Text>
      </Box>
    );
  }

  const target = aliases[selected];

  if (confirming && target) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="red" bold>⚠  Delete alias permanently?</Text>
        <Text color="white">{target.address}</Text>
        <Text color="gray">Label: {target.label}</Text>
        <Text color="yellow">All messages will be deleted. This cannot be undone.</Text>
        <Text>Press <Text color="red" bold>y</Text> to confirm, <Text color="green">n</Text> to cancel</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box borderStyle="round" borderColor="red" paddingX={1}>
        <Text color="red" bold>Tacitus — Delete Alias</Text>
        <Text color="gray">  ↑↓ select · Enter confirm · q quit</Text>
      </Box>
      {aliases.map((a, i) => (
        <Box key={a._id} paddingX={1}>
          <Text
            color={i === selected ? "red" : "gray"}
            bold={i === selected}
            inverse={i === selected}
          >
            {a.label.padEnd(20)} {a.address}
          </Text>
        </Box>
      ))}
      {aliases.length === 0 && <Text color="gray" dimColor>No aliases to delete</Text>}
    </Box>
  );
}

export default class D extends Command {
  static description = "Delete an alias and all its messages";
  static aliases = ["delete"];

  static args = {
    alias: Args.string({
      description: "Alias address or ID (optional — interactive picker if omitted)",
      required: false,
    }),
  };

  async run() {
    const { args } = await this.parse(D);
    const { waitUntilExit } = render(<DeleteUI aliasId={args.alias} />);
    await waitUntilExit();
  }
}
