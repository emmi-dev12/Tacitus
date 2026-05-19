// mail.tm API client — all requests are server-side safe (no secrets in env)
// Docs: https://docs.mail.tm

const BASE = "https://api.mail.tm";

export interface MailTmDomain {
  id: string;
  domain: string;
  isActive: boolean;
}

export interface MailTmAccount {
  id: string;
  address: string;
  token: string; // JWT — encrypted before storing in Convex
}

export interface MailTmMessage {
  id: string;
  from: { address: string; name: string };
  subject: string;
  intro: string;
  createdAt: string;
  isRead: boolean;
}

export interface MailTmMessageFull extends MailTmMessage {
  text: string;
  html: string[];
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`mail.tm ${path} → ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function getActiveDomains(): Promise<MailTmDomain[]> {
  const data = await apiFetch<{ "hydra:member": MailTmDomain[] }>("/domains");
  return data["hydra:member"].filter((d) => d.isActive);
}

export async function createAccount(
  address: string,
  password: string,
): Promise<MailTmAccount> {
  // Register
  await apiFetch<{ id: string; address: string }>("/accounts", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });

  // Authenticate to get JWT
  const auth = await apiFetch<{ token: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });

  // Get account id
  const account = await apiFetch<{ id: string; address: string }>("/me", {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  return { id: account.id, address: account.address, token: auth.token };
}

export async function authenticate(
  address: string,
  password: string,
): Promise<string> {
  const auth = await apiFetch<{ token: string }>("/token", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });
  return auth.token;
}

export async function listMessages(token: string): Promise<MailTmMessage[]> {
  const data = await apiFetch<{ "hydra:member": MailTmMessage[] }>("/messages", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data["hydra:member"];
}

export async function getMessage(
  id: string,
  token: string,
): Promise<MailTmMessageFull> {
  return apiFetch<MailTmMessageFull>(`/messages/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteMailTmAccount(
  id: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE}/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete mail.tm account: ${res.status}`);
  }
}

// Generate a random mail.tm address on an active domain (CSPRNG only)
export async function generateAddress(labelPrefix?: string): Promise<string> {
  const domains = await getActiveDomains();
  if (domains.length === 0) throw new Error("No active mail.tm domains");

  const randBytes = crypto.getRandomValues(new Uint8Array(9)); // 9 bytes: 1 for domain index, 8 for local part
  const domain = domains[randBytes[0] % domains.length];

  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"; // 36 chars
  const randomPart = Array.from(randBytes.slice(1), (b) => chars[b % chars.length]).join("");

  const local = labelPrefix
    ? `${labelPrefix.toLowerCase().replace(/[^a-z0-9]/g, "")}-${randomPart}`
    : randomPart;

  return `${local}@${domain.domain}`;
}
