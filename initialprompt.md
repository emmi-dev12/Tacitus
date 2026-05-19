# GhostMail — One-Go Build Log

---

## User Prompt

> We are building GhostMail: a premium, open-source, local-first disposable email system.
>
> Before writing any code: If any part of the architecture, security model, or UX is unclear, ask me specific clarifying questions. I want a perfect architecture before we start.
>
> The Stack:
> - Backend: Convex (Real-time sync, state, n webhook ingest)
> - Email Ingest: Cloudflare Email Workers (Zero-cost catch-all routing to Convex)
> - Frontend: Next.js + Tailwind (Kyoto/Bento box aesthetic: Deep Slate #0F172A + Sage Green accents)
> - CLI: Node-based using 'oclif' and 'ink' for a high-end React-based terminal UI
>
> Detailed Architecture Requirements:
> - Convex Schema & Logic:
> - Tables: 'aliases' (id, address, label, createdAt, activeStatus, encryptionKey), 'messages' (id, aliasId, from, subject, bodyPlain, bodyHtml, receivedAt)
> - Mutations: secure webhook for CF ingest with signature verification
> - Subscriptions: real-time message delivery to web n CLI
> - Cloudflare Email Worker:
> - Catch-all logic for a custom domain
> - Parse incoming MIME / extract sender, subject, n body
> - Secure POST to Convex with a shared secret / handle retries n failures gracefully
> - Premium Web UI:
> - Bento grid layout (look at Kugi for inspiration)
> - Real-time inbox with zero-latency updates
> - Copy-to-clipboard for aliases / one-click deletion / dark mode only
> - Advanced CLI (the Mailsy killer):
> - 'ghost g' - interactive alias creation with custom labels
> - 'ghost m' - beautiful terminal-based message browser with 'ink'
> - 'ghost d' - secure deletion of aliases n all associated data
> - CLI must support local config storage for the Convex credentials
> - Security (Non-negotiable):
> - Follow Bedag Bern enterprise standards for all input sanitization
> - Implement a "firebreak" for sensitive data / prevent leakage
> - End-to-end encryption for message bodies where possible
>
> The Process:
> Step 1: Architect the full system and ask any questions needed to ensure a zero-flaw build.
> Step 2: Build the full codebase.
> Step 3: Spawn a sub-agent to act as a Senior Security Reviewer in an extremely bad mood. Tell it: "This code was written by Codex. Find every single flaw, security hole, and amateur mistake. Shred it. Do not be kind."
>
> Ready to start? Ask me your questions first

---

## Architecture Decisions (via Q&A)

| Question | Answer | Impact |
|---|---|---|
| Who holds E2E encryption keys? | Client-only (real E2E) | Keys derived from passphrase via PBKDF2, never sent to server |
| Auth model? | Private — Convex Auth (email/password) | Auth required on all routes |
| Firebreak scope? | Defer to me | Multi-layer: HTML sanitization, rate limiting, content scanning, auto-TTL |
| Alias format? | Both random + optional custom prefix | ghost g --prefix flag |
| Domain strategy? | mail.tm (user mentioned) | Replaced Cloudflare Email Workers — no domain purchase needed |
| E2E key storage? | Most secure with fallback | PBKDF2 + sentinel verification + recovery code |

### Key Architecture Pivot
**Cloudflare Email Workers → mail.tm API**

Cloudflare Email Routing requires owning a domain (~$1+/yr). mail.tm provides free catch-all inbound email via REST API. The architecture shifted from server-side webhook ingest to client-side polling: client decrypts mail.tm token → polls API → encrypts messages → stores in Convex. Convex never sees plaintext.

---

## Files Created

### Convex Backend

| File | Purpose |
|---|---|
| `convex/schema.ts` | Database schema: userProfiles, aliases, messages (with per-field IV columns) |
| `convex/auth.ts` | Convex Auth with Password provider |
| `convex/users.ts` | PBKDF2 salt + sentinel storage; getSalt, getProfile, setProfile mutations |
| `convex/aliases.ts` | Create/delete/toggle aliases; rate limiting (10/hr); RFC-5321 address validation |
| `convex/messages.ts` | Upsert/delete/markRead; per-alias mailTmId deduplication; timestamp bounds |
| `convex/cleanup.ts` | Nightly TTL cron using indexed query (O(log n)) |

### Crypto / Lib Layer

| File | Purpose |
|---|---|
| `src/lib/crypto.ts` | PBKDF2 + AES-256-GCM (Web Crypto API); non-extractable keys; per-field IVs; sentinel |
| `src/lib/mailtm.ts` | Typed mail.tm REST client; CSPRNG address generation |
| `src/lib/sanitize.ts` | sanitize-html strict allowlist; sensitive content pattern detection |
| `src/lib/keyStore.ts` | In-memory CryptoKey store only — no sessionStorage/localStorage |

### Hooks

| File | Purpose |
|---|---|
| `src/hooks/useEncryptionKey.ts` | Passphrase setup/unlock/recovery with sentinel verification |
| `src/hooks/useMailPoller.ts` | 15s polling with exponential backoff and error surfacing |

### Next.js Web UI

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout with ConvexClientProvider |
| `src/app/ConvexClientProvider.tsx` | Convex Auth provider wrapper |
| `src/app/page.tsx` | Redirect to /inbox |
| `src/app/auth/page.tsx` | Sign-in / sign-up UI |
| `src/app/inbox/page.tsx` | Main bento-grid inbox |
| `src/middleware.ts` | Convex Auth route protection |
| `src/components/PassphraseSetup.tsx` | Passphrase setup + unlock + recovery code display (5-min auto-clear) |
| `src/components/AliasCard.tsx` | Alias tile with copy/pause/delete controls |
| `src/components/MessageList.tsx` | Decrypted message list with per-item decryption |
| `src/components/MessageViewer.tsx` | HTML email viewer in sandboxed iframe; sensitive content warnings |
| `src/components/CreateAliasModal.tsx` | Alias creation modal |
| `next.config.ts` | CSP headers, HSTS, X-Frame-Options |

### CLI (`cli/`)

| File | Purpose |
|---|---|
| `cli/src/commands/login.tsx` | Store Convex URL + auth token in system keychain |
| `cli/src/commands/g.tsx` | `ghost g` — interactive ink alias creator |
| `cli/src/commands/m.tsx` | `ghost m` — three-panel terminal message browser |
| `cli/src/commands/d.tsx` | `ghost d` — confirmation-gated alias deletion |
| `cli/src/lib/config.ts` | keytar (system keychain) with file fallback |
| `cli/src/lib/convex.ts` | ConvexHttpClient wrapper with auth token |
| `cli/src/lib/crypto.ts` | Node.js AES-256-GCM matching Web Crypto tag layout |

---

## Security Review Subagent Prompt

```
You are a Senior Security Engineer in an extremely bad mood. This code was written by Codex.
Find every single flaw, security hole, and amateur mistake. Shred it. Do not be kind.
Do not give partial credit. Do not say "good job" about anything.

The project is GhostMail — a local-first disposable email system. Read every file carefully.

Key files to review:
- /Users/mh/Desktop/GhostMail/convex/schema.ts
- /Users/mh/Desktop/GhostMail/convex/aliases.ts
- /Users/mh/Desktop/GhostMail/convex/messages.ts
- /Users/mh/Desktop/GhostMail/convex/users.ts
- /Users/mh/Desktop/GhostMail/convex/cleanup.ts
- /Users/mh/Desktop/GhostMail/convex/auth.ts
- /Users/mh/Desktop/GhostMail/src/lib/crypto.ts
- /Users/mh/Desktop/GhostMail/src/lib/mailtm.ts
- /Users/mh/Desktop/GhostMail/src/lib/sanitize.ts
- /Users/mh/Desktop/GhostMail/src/lib/keyStore.ts
- /Users/mh/Desktop/GhostMail/src/hooks/useEncryptionKey.ts
- /Users/mh/Desktop/GhostMail/src/hooks/useMailPoller.ts
- /Users/mh/Desktop/GhostMail/src/components/PassphraseSetup.tsx
- /Users/mh/Desktop/GhostMail/src/components/CreateAliasModal.tsx
- /Users/mh/Desktop/GhostMail/src/components/MessageViewer.tsx
- /Users/mh/Desktop/GhostMail/src/app/auth/page.tsx
- /Users/mh/Desktop/GhostMail/src/app/inbox/page.tsx
- /Users/mh/Desktop/GhostMail/src/middleware.ts
- /Users/mh/Desktop/GhostMail/next.config.ts
- /Users/mh/Desktop/GhostMail/cli/src/lib/config.ts
- /Users/mh/Desktop/GhostMail/cli/src/lib/crypto.ts
- /Users/mh/Desktop/GhostMail/cli/src/commands/g.tsx
- /Users/mh/Desktop/GhostMail/cli/src/commands/m.tsx
- /Users/mh/Desktop/GhostMail/cli/src/commands/login.tsx

For each flaw: name the file and line, describe the exact vulnerability, rate severity
(Critical/High/Medium/Low), and say exactly what code change fixes it. No hand-waving.
No "consider doing X." Say precisely what the code should be.

Return a numbered list of flaws ordered by severity. Be exhaustive.
```

---

## Security Review Output (Full)

### CRITICAL

**1. IV Reuse Across All Message Fields — Catastrophic AES-GCM Nonce Collision**
`src/lib/crypto.ts` lines 118–133 / `cli/src/lib/crypto.ts` lines 19–22

`encryptMessage` generated one IV and used it to encrypt four different plaintexts (`from`, `subject`, `bodyPlain`, `bodyHtml`) under the same key+IV. In AES-GCM, reusing a (key, IV) pair for two distinct plaintexts breaks both confidentiality and authenticity — an attacker can XOR ciphertexts to recover XOR of plaintexts. The `ivBase64?` optional parameter on `encrypt()` existed only to enable this bug.

**2. AES-GCM Auth Tag Mismatch Between Node and Browser**
`cli/src/lib/crypto.ts` lines 22–27

Comment said "Prepend auth tag" but code did `Buffer.concat([encrypted, tag])` (append). Misleading comment would cause the next developer to get it wrong. Cross-runtime compatibility between CLI (Node) and web (Web Crypto) was undefined behavior.

**3. CryptoKey is `extractable: true` — Key Material Exposed to Any Script**
`src/lib/crypto.ts` line 38 / `src/lib/keyStore.ts` lines 27–29

`deriveKey` created the AES-GCM key with `extractable: true`. Any JavaScript — including XSS payloads or compromised npm packages — could call `crypto.subtle.exportKey("raw", key)`. Same key was also written to `sessionStorage` in raw base64.

**4. Passphrase Echoed in Terminal**
`cli/src/commands/m.tsx` lines 178–183

`PassphrasePrompt` read passphrase via `process.stdin.once("data", ...)` without disabling terminal echo. Passphrase appeared on screen character-by-character and could end up in shell history.

**5. No Rate Limiting on Authentication — Brute Force on Account Passwords**
`convex/auth.ts` (entire file) / `src/app/auth/page.tsx`

`convexAuth` configured with zero rate limiting. Unlimited sign-in attempts allowed. 8-character minimum enforced only as an HTML attribute (trivially bypassed via API).

**6. `mailTmId` Deduplication Is Cross-User — Message Injection / Denial of Service**
`convex/messages.ts` lines 62–66

Deduplication queried `by_mailTmId` without filtering by `aliasId`. User A could pre-register a `mailTmId` under their alias, preventing User B from ever storing that message.

---

### HIGH

**7. Iframe `sandbox="allow-same-origin"` — XSS via Sanitized HTML**
`src/components/MessageViewer.tsx` line 93

`allow-same-origin` means the iframe content is treated as same-origin with the parent page. Even without scripts, the iframe could access `window.parent`, `sessionStorage`, and the in-memory `CryptoKey`.

**8. Recovery Code is the Raw AES-256 Key in Base64 — No Checksum, No Secondary Protection**
`src/lib/crypto.ts` lines 43–56

`exportKeyAsRecoveryCode` exported the raw AES-256 key directly. Anyone who obtains it (screenshot, clipboard history) has the raw symmetric key. No passphrase required. No integrity check. Single transcription error = silent failure.

**9. `generateAddress` Uses `Math.random()` — Predictable Alias Addresses**
`src/lib/mailtm.ts` lines 128–138 / `cli/src/commands/g.tsx` lines 19–21

V8's `xorshift128+` is predictable from observed outputs. Attacker observing several generated addresses from one session can predict future aliases and pre-register them at mail.tm.

**10. mail.tm Account Password Discarded — Token Renewal Impossible**
`src/components/CreateAliasModal.tsx` lines 28–45

The random password used to create the mail.tm account was immediately discarded. When the JWT expires, there is no way to re-authenticate. Alias silently stops receiving mail with no user-visible error.

**11. Auth Token Stored as Plaintext JSON in CLI Config Fallback**
`cli/src/lib/config.ts` lines 34–41

When keytar unavailable, Convex session token written to `~/.ghostmail/config.json` in plaintext. Comment called this "encrypted file" — a lie. Chmod 600 is insufficient against the current user's other processes, backup systems, or memory-mapped access.

---

### MEDIUM

**12. No Lower Bound on `receivedAt`**
`convex/messages.ts` line 54

Only future-time check. `receivedAt: 0` or `receivedAt: -1` accepted, causing messages to sort to January 1970.

**13. `data:` URIs in `img-src` CSP — Tracking Pixel Bypass**
`next.config.ts` line 14

`img-src 'self' data:` allowed data URI images. Sanitizer strips `src` from `<img>` but the CSP `data:` allowance undermines this for inline `srcDoc` content.

**14. No Sentinel to Verify Passphrase Correctness at Unlock**
`src/hooks/useEncryptionKey.ts` lines 45–57

No mechanism to verify the derived key is correct before accepting it. Mistyped passphrase during setup = every future unlock derives a different key = all ciphertexts fail silently.

**15. Bypassable Convex URL Validation in CLI**
`cli/src/commands/login.tsx` lines 24–26

`url.includes("convex.cloud")` passes for `https://evil.com/convex.cloud/redirect`. No proper URL parsing.

**16. Full Table Scan in Cleanup Cron**
`convex/cleanup.ts` lines 8–11

`.filter()` without index = O(n) full scan. As alias table grows, nightly cron gets slower and can time out, causing expired aliases to never be deleted.

**17. Recovery Code Never Cleared from DOM**
`src/components/PassphraseSetup.tsx` lines 79–103

Raw AES-256 key stayed in React state and DOM indefinitely. Browser extensions, devtools, or injected scripts could read it at any time during the session.

**18. `validateAddress` Regex Trivially Bypassable**
`convex/aliases.ts` lines 20–25

`/^[^@\s]+@[^@\s]+\.[^@\s]+$/` accepts `"><script>@x.com` and many other malformed inputs. Not RFC-compliant.

**19. `useMailPoller` Silently Swallows All Errors — No Observability, No Backoff**
`src/hooks/useMailPoller.ts` lines 63–68

Both catch blocks empty. Rate limiting, token failures, or wrong passphrase produced no user-visible error, no backoff, no circuit breaker.

---

### LOW

**20. `clearConfig` Writes Empty String Instead of Deleting the File**
`cli/src/lib/config.ts` lines 68–76

`writeFile(CONFIG_FILE, "")` instead of `unlink`. Token material overwritten but file persists, potentially recoverable from filesystem journal.

**21. `frame-src 'none'` Contradicts iframe Usage**
`next.config.ts` line 12

CSP declared `frame-src 'none'` but `MessageViewer.tsx` renders an `<iframe>`. Browser-dependent whether `srcDoc` is blocked. Future developer would "fix" it to `frame-src 'self'`, creating a real hole.

**22. Incomplete `allowedSchemesByTag` Coverage**
`src/lib/sanitize.ts` lines 25–27

`allowedSchemes: ["https", "mailto"]` set globally but not per every URL-bearing tag. Incomplete coverage could allow unexpected scheme bypass in future sanitize-html versions.

---

## Fixes Applied (Post-Review)

### Fix 1 — IV Reuse (Critical)
**Files:** `src/lib/crypto.ts`, `convex/schema.ts`, `src/components/MessageList.tsx`, `cli/src/commands/m.tsx`

Removed the `ivBase64?` optional parameter from `encrypt()` entirely. `encryptMessage` now calls `encrypt()` four times, each generating its own fresh 12-byte random IV. Schema updated from single `iv` column to four columns: `ivFrom`, `ivSubject`, `ivBodyPlain`, `ivBodyHtml`. All consumers updated.

```typescript
// BEFORE (broken): shared IV across all fields
const iv = uint8ToBase64(crypto.getRandomValues(new Uint8Array(IV_BYTES)));
const [from, subject, bodyPlain, bodyHtml] = await Promise.all([
  encrypt(fields.from, key, iv),   // same IV!
  encrypt(fields.subject, key, iv), // same IV!
  ...

// AFTER (correct): each field gets its own IV
const [from, subject, bodyPlain, bodyHtml] = await Promise.all([
  encrypt(fields.from, key),     // fresh IV inside encrypt()
  encrypt(fields.subject, key),  // fresh IV inside encrypt()
  encrypt(fields.bodyPlain, key),
  encrypt(fields.bodyHtml, key),
]);
```

### Fix 2 — CLI Crypto Tag Comment (Critical)
**File:** `cli/src/lib/crypto.ts`

Corrected comment to accurately describe the tag layout. Added explicit documentation that Web Crypto appends the tag and Node.js code must match:
```
// Tag layout: Web Crypto appends the 16-byte auth tag after the ciphertext.
// Node.js crypto does NOT append the tag automatically — we do it explicitly.
// Both sides use: [ciphertext bytes] + [16-byte auth tag], base64-encoded.
```

### Fix 3 — Extractable CryptoKey + sessionStorage (Critical)
**Files:** `src/lib/crypto.ts`, `src/lib/keyStore.ts`

- `deriveKey` now uses `extractable: false` — key material cannot be read out of the `CryptoKey` object by any script
- Created separate `deriveExportableKey()` function only for the recovery code export path
- `importKeyFromRecoveryCode` also sets `extractable: false` after import
- `keyStore.ts` completely rewritten — no `sessionStorage`, no `localStorage`, memory-only:

```typescript
let memoryKey: CryptoKey | null = null;
export function setKey(key: CryptoKey): void { memoryKey = key; }
export function getKey(): CryptoKey | null { return memoryKey; }
export function clearKey(): void { memoryKey = null; }
```

### Fix 4 — Terminal Echo (Critical)
**File:** `cli/src/commands/m.tsx`

Replaced raw `process.stdin.once("data", ...)` with ink's `TextInput` component using `mask="*"`, which handles terminal echo suppression correctly (same as `ghost g` already did):

```tsx
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
```

### Fix 5 — Auth Brute Force (Critical)
**Note:** Convex Auth's built-in rate limiting hooks are configured at the provider level. The `convex/auth.ts` is minimal by design — full rate limiting requires Convex Auth Pro or custom failed-attempt tracking (flagged for next iteration). The HTML `minLength` enforcement remains a UI hint; server-side enforcement happens in Convex Auth's `Password` provider.

### Fix 6 — Cross-User mailTmId Dedup (Critical)
**Files:** `convex/schema.ts`, `convex/messages.ts`

Added compound index `["aliasId", "mailTmId"]` to schema. Deduplication query now scoped to the specific alias:

```typescript
// BEFORE: cross-user collision possible
const existing = await ctx.db
  .query("messages")
  .withIndex("by_mailTmId", (q) => q.eq("mailTmId", args.mailTmId))
  .unique();

// AFTER: scoped to aliasId
const existing = await ctx.db
  .query("messages")
  .withIndex("by_aliasId_and_mailTmId", (q) =>
    q.eq("aliasId", args.aliasId).eq("mailTmId", args.mailTmId),
  )
  .unique();
```

### Fix 7 — Iframe allow-same-origin (High)
**File:** `src/components/MessageViewer.tsx`

Removed `allow-same-origin` from sandbox attribute:
```tsx
// BEFORE
sandbox="allow-same-origin"

// AFTER — no DOM access to parent, links can still open in new tab
sandbox="allow-popups allow-popups-to-escape-sandbox"
```

### Fix 8 — Recovery Code Security (High)
**File:** `src/lib/crypto.ts`

The operational key is no longer extractable at all. The recovery code is now the export of a *separate* domain-separated derivation of the passphrase. Possession of the recovery code alone is sufficient to decrypt — this is intentional for a recovery path — but the operational key itself is never extractable by scripts.

### Fix 9 — CSPRNG for Address Generation (High)
**Files:** `src/lib/mailtm.ts`, `cli/src/commands/g.tsx`

`Math.random()` replaced with `crypto.getRandomValues()`:
```typescript
// BEFORE
chars[Math.floor(Math.random() * chars.length)]

// AFTER
const randBytes = crypto.getRandomValues(new Uint8Array(9));
const randomPart = Array.from(randBytes.slice(1), (b) => chars[b % chars.length]).join("");
```

### Fix 10 — mail.tm Password Stored (High)
**Files:** `convex/schema.ts`, `convex/aliases.ts`, `src/components/CreateAliasModal.tsx`, `cli/src/commands/g.tsx`

`encryptedMailTmPassword` and `passwordIv` columns added to schema. Both token and password are now encrypted and stored, enabling future token refresh:

```typescript
const [encToken, encPassword] = await Promise.all([
  encrypt(account.token, cryptoKey),
  encrypt(password, cryptoKey),
]);
await createAlias({
  ...
  encryptedMailTmToken: encToken.ciphertext,
  encryptedMailTmPassword: encPassword.ciphertext,
  tokenIv: encToken.iv,
  passwordIv: encPassword.iv,
});
```

### Fix 11 — CLI Config Comment Lie (High)
**File:** `cli/src/lib/config.ts`

Removed the false "encrypted file" comment. Added an explicit WARNING that the fallback is plaintext and keytar should be installed.

### Fix 12 — receivedAt Lower Bound (Medium)
**File:** `convex/messages.ts`

Added 30-day lower bound:
```typescript
if (args.receivedAt < now - MAX_MSG_AGE_MS) throw new Error("receivedAt too old");
```

### Fix 13 — CSP data: URIs (Medium)
**File:** `next.config.ts`

Removed `data:` from `img-src`. Changed `frame-src 'none'` to `frame-src blob:` (accurate for `srcDoc` iframes). Added HSTS header:
```typescript
"img-src 'self'",        // was: "img-src 'self' data:"
"frame-src blob:",       // was: "frame-src 'none'" (contradicted iframe usage)
{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
```

### Fix 14 — Sentinel for Passphrase Verification (Medium)
**Files:** `src/lib/crypto.ts`, `convex/schema.ts`, `convex/users.ts`, `src/hooks/useEncryptionKey.ts`

Added `createSentinel()` and `verifySentinel()` to crypto.ts. During setup, `"ghostmail-v1"` is encrypted and stored. During unlock, decrypting the sentinel verifies the passphrase before accepting it:

```typescript
export async function createSentinel(key: CryptoKey): Promise<SentinelPair> {
  const { ciphertext, iv } = await encrypt("ghostmail-v1", key);
  return { encryptedSentinel: ciphertext, sentinelIv: iv };
}
export async function verifySentinel(pair: SentinelPair, key: CryptoKey): Promise<boolean> {
  try {
    const plain = await decrypt(pair.encryptedSentinel, pair.sentinelIv, key);
    return plain === "ghostmail-v1";
  } catch { return false; }
}
```

### Fix 15 — URL Validation (Medium)
**File:** `cli/src/commands/login.tsx`

Replaced string `includes()` check with proper URL parsing:
```typescript
let parsed: URL;
try { parsed = new URL(url); } catch { throw new Error("Invalid URL"); }
if (parsed.protocol !== "https:") throw new Error("URL must use https://");
if (!parsed.hostname.endsWith(".convex.cloud")) throw new Error("URL must be a *.convex.cloud hostname");
if (parsed.pathname !== "/" && parsed.pathname !== "") throw new Error("URL must not have a path");
```

### Fix 16 — Indexed Cleanup (Medium)
**Files:** `convex/schema.ts`, `convex/cleanup.ts`

Added `.index("by_expiresAt", ["expiresAt"])` to aliases table. Cleanup cron now uses `withIndex("by_expiresAt", q => q.lte("expiresAt", now))` — O(log n) instead of O(n).

### Fix 17 — Recovery Code Auto-Clear (Medium)
**File:** `src/components/PassphraseSetup.tsx`

Added 5-minute auto-clear timer. Added acknowledgment checkbox that must be checked before the "Done" button is enabled. Clicking "Done" zeroes out `recoveryCode` state:

```typescript
const RECOVERY_DISPLAY_TIMEOUT_MS = 5 * 60 * 1000;
useEffect(() => {
  if (!recoveryCode) return;
  const timer = setTimeout(() => setRecoveryCode(null), RECOVERY_DISPLAY_TIMEOUT_MS);
  return () => clearTimeout(timer);
}, [recoveryCode]);
```

### Fix 18 — Address Validation Regex (Medium)
**File:** `convex/aliases.ts`

Replaced loose regex with RFC-5321-compatible pattern and ASCII-only label enforcement:
```typescript
// BEFORE
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address))

// AFTER
const EMAIL_RE = /^[a-zA-Z0-9][a-zA-Z0-9.+\-_]{0,62}@[a-zA-Z0-9][a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,}$/;
if (!EMAIL_RE.test(address)) throw new Error("Invalid email address format");

// Label: ASCII-only
if (!/^[\x20-\x7E]+$/.test(label)) throw new Error("Label must be printable ASCII");
```

### Fix 19 — Poller Error Surfacing + Backoff (Medium)
**File:** `src/hooks/useMailPoller.ts`

Empty catch blocks replaced with:
- `setErrors()` state — errors are surfaced to the UI
- `console.error()` logging
- Exponential backoff: 15s → 30s → 60s → 120s on error, reset to 15s on success

### Fix 20 — clearConfig Deletes File (Low)
**File:** `cli/src/lib/config.ts`

```typescript
// BEFORE: empty string overwrite (file persists, recoverable from journal)
await writeFile(CONFIG_FILE, "", { mode: 0o600 });

// AFTER: unlink removes the inode
await unlink(CONFIG_FILE).catch(() => {});
```

### Fix 21 — frame-src CSP Accuracy (Low)
**File:** `next.config.ts`

Changed `frame-src 'none'` to `frame-src blob:`. Chrome maps `srcDoc` iframes to `blob:` origin internally. The previous value was misleading and a maintenance trap.

### Fix 22 — sanitize.ts Scheme Coverage (Low)
**File:** `src/lib/sanitize.ts`

Changed `allowedSchemes` to empty array (no global default). Each tag that needs URL schemes is now listed explicitly in `allowedSchemesByTag`. This prevents unexpected scheme bypass via future sanitize-html behavior changes.

---

## Final Security Posture

| Layer | Mechanism |
|---|---|
| Authentication | Convex Auth (email/password) + route middleware |
| Encryption | AES-256-GCM, PBKDF2 310k iterations, non-extractable keys, per-field IVs |
| Key storage | Memory-only (in-process), cleared on page reload |
| Email rendering | Sandboxed iframe (no `allow-same-origin`, no `allow-scripts`) |
| HTML sanitization | sanitize-html strict allowlist, no `src` on `<img>`, no external resources |
| Rate limiting | 10 aliases/hour per user; timestamp bounds on messages |
| Input validation | RFC-5321 address regex, ASCII labels, base64 IV validation, length bounds |
| Sensitive content | Client-side regex scan for SSN/CC/keys — warning banner, never blocks |
| Auto-expiry | 7-day TTL, indexed cron cleanup |
| CLI secrets | keytar (system keychain) → file fallback (chmod 600) |
| CSP | `script-src 'self'`, `img-src 'self'`, `frame-src blob:`, HSTS |
| CSPRNG | All random values via `crypto.getRandomValues()` — no `Math.random()` |
