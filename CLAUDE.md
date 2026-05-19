# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

### Web app
```bash
npm run dev        # start Next.js dev server
npm run build      # production build
npm run lint       # ESLint
```

### Convex backend
```bash
npx convex dev     # deploy schema/functions + start local sync (required before web app)
npx convex env set AUTH_SECRET "$(openssl rand -base64 32)"  # one-time setup
```

### CLI (`cli/`)
```bash
cd cli
npm run build      # compile TypeScript → dist/
npm run dev        # run without compile (ts-node)
./bin/run.js ghost login   # or: ghost g / ghost m / ghost d after build
```

## Architecture

GhostMail is a local-first disposable email system. The defining architectural constraint is **Convex never sees plaintext** — all encryption and decryption happens client-side.

### Data flow
1. User sets a passphrase → `PBKDF2` (310k iterations) derives a non-extractable `CryptoKey` held only in memory (`src/lib/keyStore.ts`)
2. `useMailPoller` (15s interval, exponential backoff) polls [mail.tm](https://mail.tm) for new messages
3. Each message is encrypted with `AES-256-GCM` via `encryptMessage` — **each field gets its own random 12-byte IV** — and stored in Convex
4. The inbox decrypts lazily in the browser; the `CryptoKey` is cleared on page reload

### Three separate packages
- **Root** — Next.js 16 web app (App Router, Tailwind v4, React 19)
- **`convex/`** — Convex backend functions (schema, mutations, queries, nightly cleanup cron)
- **`cli/`** — oclif + ink CLI with its own `package.json` and `tsconfig.json`; compiled separately

### Convex schema key points (`convex/schema.ts`)
- `userProfiles` — PBKDF2 salt + encrypted sentinel used to verify passphrase correctness
- `aliases` — one mail.tm account per alias; token and password are both AES-encrypted; indexed by `expiresAt` for O(log n) TTL cleanup
- `messages` — four ciphertext/IV pairs per message (`From`, `Subject`, `bodyPlain`, `bodyHtml`); deduplication scoped to `(aliasId, mailTmId)` to prevent cross-user collision

### Crypto invariants (`src/lib/crypto.ts`)
- Operational `CryptoKey` is always `extractable: false`
- Recovery code derives a *separate* domain-separated exportable key — never exports the operational key
- `encryptMessage` calls `encrypt()` four times independently; sharing an IV across fields is a critical bug (AES-GCM nonce reuse breaks both confidentiality and authenticity)

### CLI credentials (`cli/src/lib/config.ts`)
- Convex URL + auth token stored in the system keychain via `keytar`; falls back to `~/.ghostmail/config.json` (chmod 600, plaintext — not encrypted)

### Security boundaries
- `MessageViewer.tsx` renders HTML email in a sandboxed iframe — no `allow-same-origin`, no `allow-scripts`
- `src/lib/sanitize.ts` — strict `sanitize-html` allowlist; `allowedSchemes` is empty globally, explicit per tag
- `next.config.ts` — CSP, HSTS, X-Frame-Options headers
- `convex/aliases.ts` — 10 alias/hour rate limit; RFC-5321 address regex; ASCII-only labels
- `convex/cleanup.ts` — nightly cron deletes expired aliases using `by_expiresAt` index
