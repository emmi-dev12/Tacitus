const KEY = "tacitus_convex_url";

// Only accept official Convex deployment domains.
// Custom domains require explicit opt-in to prevent attacker-controlled backends.
function validateConvexUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Invalid URL format");
  }
  if (parsed.protocol !== "https:") throw new Error("URL must use HTTPS");
  if (!parsed.hostname.endsWith(".convex.cloud")) {
    throw new Error("URL must be a *.convex.cloud deployment (e.g. https://your-project.convex.cloud)");
  }
  return parsed;
}

export function getStoredConvexUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = validateConvexUrl(raw);
    return parsed.origin;
  } catch {
    // Stored value is invalid — clear it so the user is sent to setup
    localStorage.removeItem(KEY);
    return null;
  }
}

export function storeConvexUrl(url: string): void {
  const parsed = validateConvexUrl(url);
  localStorage.setItem(KEY, parsed.origin);
}

export function clearConvexConfig(): void {
  localStorage.removeItem(KEY);
}
