import { readFile, writeFile, chmod, unlink } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".tacitus");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const SERVICE = "tacitus";
const ACCOUNT = "credentials";

export interface TacitusConfig {
  convexUrl: string;
  authToken: string;
}

async function tryKeytar(): Promise<typeof import("keytar") | null> {
  try {
    const kt = await import("keytar");
    return kt.default ?? kt;
  } catch {
    return null;
  }
}

export async function saveConfig(config: TacitusConfig): Promise<void> {
  const kt = await tryKeytar();
  const payload = JSON.stringify(config);

  if (kt) {
    await kt.setPassword(SERVICE, ACCOUNT, payload);
    return;
  }

  // Fallback: plaintext JSON in ~/.tacitus/config.json (chmod 600)
  // WARNING: keytar unavailable — credentials are stored unencrypted on disk.
  // Install the keytar native module or use the web UI for better security.
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  await writeFile(CONFIG_FILE, payload, { encoding: "utf-8", mode: 0o600 });
  await chmod(CONFIG_FILE, 0o600);
}

export async function loadConfig(): Promise<TacitusConfig | null> {
  const kt = await tryKeytar();

  if (kt) {
    const raw = await kt.getPassword(SERVICE, ACCOUNT);
    if (raw) {
      try { return JSON.parse(raw) as TacitusConfig; } catch { return null; }
    }
    return null;
  }

  if (!existsSync(CONFIG_FILE)) return null;
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as TacitusConfig;
  } catch {
    return null;
  }
}

export async function clearConfig(): Promise<void> {
  const kt = await tryKeytar();
  if (kt) {
    await kt.deletePassword(SERVICE, ACCOUNT);
    return;
  }
  // Delete the file rather than overwriting with empty — prevents journal recovery
  await unlink(CONFIG_FILE).catch(() => {});
}
