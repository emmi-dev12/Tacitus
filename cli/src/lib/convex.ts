import { ConvexHttpClient } from "convex/browser";
import { loadConfig } from "./config.js";

let _client: ConvexHttpClient | null = null;

export async function getClient(): Promise<ConvexHttpClient> {
  if (_client) return _client;
  const config = await loadConfig();
  if (!config) {
    throw new Error(
      "GhostMail is not configured. Run: ghost login",
    );
  }
  _client = new ConvexHttpClient(config.convexUrl);
  _client.setAuth(config.authToken);
  return _client;
}
