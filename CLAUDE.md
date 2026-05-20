# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

### Web app (root package)
```bash
npm run dev        # Next.js dev server
npm run build      # production build (static export → out/)
npm run lint       # ESLint
```

### Convex backend
```bash
npx convex dev     # deploy schema/functions + start local sync (run before web app)
npx convex env set AUTH_SECRET "$(openssl rand -base64 32)"  # one-time setup
npx @convex-dev/auth          # one-time: provisions JWT_PRIVATE_KEY, JWKS, SITE_URL (local)
npx @convex-dev/auth --prod   # same for prod deployment
npx convex deploy             # push functions to prod
```

### CLI (`cli/`)
```bash
cd cli
npm run build      # compile TypeScript → dist/
npm run dev        # run without compile (ts-node)
./bin/run.js tac login   # or: tac g / tac m / tac d after build
```

### TypeScript check (Next.js build is broken on Node 26 — use tsc directly)
```bash
node node_modules/typescript/bin/tsc --noEmit
```

## Architecture

Tacitus is a local-first disposable email system. The defining constraint is **Convex never sees plaintext** — all encryption and decryption happens client-side in the browser.

The Next.js app is a **fully static export** (`output: "export"` in `next.config.ts`) deployed to Render as a static site. There is no Next.js server — the entire backend is Convex.

### Three separate packages

- **Root** — Next.js 16 web app (App Router, Tailwind v4, React 19, static export)
- **`convex/`** — Convex backend (schema, mutations, queries, auth, nightly cleanup cron)
- **`cli/`** — oclif + ink CLI; its own `package.json` and `tsconfig.json`; compiled separately; binary is `tac`

### Route map

```
/           → redirects to /landing (configured) or /setup (not configured)
/setup      → BYOD wizard; stores Convex URL in localStorage
/landing    → marketing/entry page; links to /auth
/auth       → sign-up / sign-in
/inbox      → main app (requires auth + passphrase unlock)
```

`ClientProviders.tsx` reads `localStorage["tacitus_convex_url"]` on every load. If missing, any non-`/setup` / non-`/landing` route is redirected to `/setup`. Routes `/setup` and `/landing` render without a Convex provider (defined in `NO_CONVEX_ROUTES`).

### Authentication

Auth uses `@convex-dev/auth` with the `Password` provider. Users authenticate with a **username + passphrase only** — no separate password. The auto-generated passphrase (5 words from a 256-word list, `src/lib/wordlist.ts`) serves as both the Convex Auth credential and the PBKDF2 key derivation input. `convex/auth.ts` converts the username to a synthetic `username@tacitus.local` email internally. Username rules: 3–32 chars, `^[a-z0-9_-]+$` only.

### Data flow

1. User authenticates (Convex Auth) with username + passphrase → session token
2. Passphrase → `PBKDF2` (**600k iterations**, SHA-256) derives a non-extractable `CryptoKey` held only in memory (`src/lib/keyStore.ts`)
3. A sentinel value (`"tacitus-v1"`) is encrypted and stored in `userProfiles` to verify the passphrase on future unlocks
4. On signup: both PBKDF2 derivations (operational key + recovery code exportable key) run in parallel; `src/lib/pendingPassphrase.ts` bridges the passphrase to the inbox for auto-unlock without a second prompt
5. `useMailPoller` (15s interval, exponential backoff) polls [mail.tm](https://mail.tm) for new messages on each alias
6. Each message is encrypted with `AES-256-GCM` via `encryptMessage` — **each field gets its own random 12-byte IV** — and stored in Convex
7. The inbox decrypts lazily in the browser; the `CryptoKey` is cleared on page reload

### Encryption key lifecycle (`useEncryptionKey` hook)

`KeyStatus` has three states: `"loading"` → `"needs_unlock"` → `"unlocked"`. The hook is the single gatekeeper for all crypto operations in the inbox. On mount it checks `keyStore.ts` (in-memory); if missing, it checks `pendingPassphrase.ts` (bridged from signup); otherwise shows `PassphraseSetup`. The key never touches `localStorage` or `sessionStorage`.

### Provider architecture

`ConvexClientProvider` lives at the **root layout** (`src/app/layout.tsx`) — a single `ConvexReactClient` instance for the entire app lifetime. Route-level layouts (`/auth`, `/inbox`, `/landing`) do NOT wrap their own providers. This is critical: per-route providers caused a `ConvexReactClient has already been closed` crash on navigation. Shared error messages live in `src/app/convexErrorMessages.ts` to avoid circular imports between `ClientProviders` and `ConvexClientProvider`.

### Convex schema (`convex/schema.ts`)

- `userProfiles` — PBKDF2 salt + AES-GCM encrypted sentinel, keyed by `userId`
- `aliases` — one mail.tm account per alias; token and password are AES-encrypted; indexed by `expiresAt` for O(log n) TTL cleanup
- `messages` — four ciphertext/IV pairs per message (`From`, `Subject`, `bodyPlain`, `bodyHtml`); deduplicated on `(aliasId, mailTmId)` to prevent cross-user collision

### Crypto invariants (`src/lib/crypto.ts`)

- Operational `CryptoKey` is always `extractable: false`
- Recovery code re-derives a separate extractable key (same PBKDF2 params) and exports raw bytes — the operational key is never exported; `importKeyFromRecoveryCode` re-imports as `extractable: false`
- `encryptMessage` calls `encrypt()` four times with independent IVs; sharing an IV across fields is a critical bug (AES-GCM nonce reuse destroys both confidentiality and authenticity)
- Both PBKDF2 passes (operational + recovery) run concurrently via `Promise.all` on signup

### Cross-device access

On signup the success screen shows a QR code encoding `origin/auth#u=USERNAME&p=PASSPHRASE`. The hash fragment is never sent to the server. On the receiving device `SigninView` reads `window.location.hash`, pre-fills the form, and immediately clears the fragment via `history.replaceState`.

### BYOD setup wizard (`/setup`)

First-time users who deploy their own Convex backend go through a 5-step wizard (`src/app/setup/`). It uses a "Deploy to Convex" button (template URL) instead of CLI commands, generates `AUTH_SECRET` in the browser via `crypto.getRandomValues`, then stores the deployment URL in `localStorage` via `src/lib/convexConfig.ts`. The stored URL is validated on every read: must be `https://` and match `*.convex.cloud`. `storeConvexUrl` validates and overwrites atomically — no separate clear needed before storing a replacement.

### CLI credentials (`cli/src/lib/config.ts`)

Convex URL + auth token stored in the system keychain via `keytar`; falls back to `~/.tacitus/config.json` (chmod 600, plaintext).

### Security boundaries

- `MessageViewer.tsx` renders HTML email in a sandboxed iframe — `sandbox=""` with no flags (no `allow-same-origin`, no `allow-scripts`)
- `src/lib/sanitize.ts` — strict `sanitize-html` allowlist; `allowedSchemes` is empty globally, explicit per tag
- Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) live in `public/_headers` — this is a Render static site, so `next.config.ts` headers are ignored; `public/_headers` is the authoritative source
- `convex/aliases.ts` — 10 alias/hour rate limit; RFC-5321 address regex; ASCII-only labels
- `convex/cleanup.ts` — nightly cron deletes expired aliases using `by_expiresAt` index

### localStorage keys

| Key | Owner | Purpose |
|-----|-------|---------|
| `tacitus_convex_url` | `src/lib/convexConfig.ts` | Stores validated Convex deployment URL |
| `tacitus_unlock_throttle` | `src/components/PassphraseSetup.tsx` | UX-only unlock attempt counter (not a security control) |
| `pwa-ios-dismissed` | `src/components/PwaInstallPrompt.tsx` | Suppresses iOS PWA install prompt |

`sessionStorage["tacitus_setup_auth_secret"]` holds the wizard-generated `AUTH_SECRET` only during the `/setup` flow; cleared on wizard completion.

### UI color palette

All inline styles use a consistent dark-terminal palette. Readable text values:
- Primary text: `#c8d4e0`
- Secondary/labels: `#5a8070`
- Tertiary/hints: `#4a7060`
- Body copy: `#8ab0c0`
- Accent: `#00ff8c`
- Background: `#080d14`

Never use `#2d4050`, `#1a2a36`, or `#3a5060` for readable text — these are near-invisible on the dark background (contrast < 2.5:1).

### PWA

`public/manifest.json` + `public/sw.js` make the app installable. The service worker is intentionally minimal (no caching) — caching crypto JS without integrity verification would be a code-injection surface.

### Post-task workflow

After every coding change, run the `tacitus-review` skill: hostile security reviewer loop (up to 4 rounds, fix all Critical/High), then append an entry to `chatlogs.md`. Never report a task done until both steps are complete.
