import { ConvexHttpClient } from "convex/browser";
import { loadConfig } from "./config.js";

let _client: ConvexHttpClient | null = null;
let _clientToken: string | null = null;
let _clientUrl: string | null = null;

export async function getClient(): Promise<ConvexHttpClient> {
  const config = await loadConfig();
  if (!config) {
    throw new Error("Tacitus is not configured. Run: tac login");
  }
  // Rebuild client if URL or token has changed (e.g., after tac login in another terminal)
  if (!_client || config.convexUrl !== _clientUrl || config.authToken !== _clientToken) {
    _client = new ConvexHttpClient(config.convexUrl);
    _client.setAuth(config.authToken);
    _clientUrl = config.convexUrl;
    _clientToken = config.authToken;
  }
  return _client;
}
