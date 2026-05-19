# Tacitus

*Silent messenger. Local-first disposable email with end-to-end encryption.*

[Initial prompt](initialprompt.md) · [Development log](chatlogs.md)

---

## Philosophy of Tacitus

The Latin word *tacitus* means silent, unspoken, secret. It names what this tool aspires to be.

Most disposable email services are loud. They harvest usage patterns, store messages on servers you don't control, and trade your data for uptime. They are noisy by design — they have to be, to run a business on your information.

Tacitus works differently. Your passphrase never leaves your device. Your messages are encrypted before they reach any server. The backend stores only ciphertext it cannot read. When you delete an alias, there is nothing left to recover.

This is not a new idea. It is the oldest idea in private communication: only the people in the conversation should be able to read it. Everything else is noise. Tacitus is the absence of noise.

The design language reflects this. Deep Slate backgrounds. Sage Green accents. No gradients fighting for your attention. No unread counts pulsing red. The interface recedes — it is a window, not a billboard.

---

## Stack

- **Email ingest**: [mail.tm](https://mail.tm) — free catch-all domains, no domain purchase required
- **Backend + real-time sync**: [Convex](https://convex.dev)
- **Auth**: Convex Auth (email/password)
- **Frontend**: Next.js + Tailwind CSS
- **CLI**: oclif + ink (React terminal UI), binary: `tac`
- **E2E Encryption**: PBKDF2 (600k iterations, SHA-256) → AES-256-GCM, client-side only — key never reaches the server

## Security model

- Passphrase → PBKDF2 → AES-256-GCM key (non-extractable `CryptoKey`, lives in memory only)
- Every field encrypted with its own random 12-byte IV
- Recovery code derived with a domain-separated salt — cryptographically distinct from the operational key
- Sentinel value (`tacitus-v1`) encrypted at setup; verified on every unlock — wrong passphrase is rejected before any data is touched
- Sanitize-html strict allowlist before encryption and before render; iframe `sandbox=""` with `default-src 'none'` CSP
- Rate limit: 10 aliases per user per hour

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Initialize Convex

```bash
npx convex dev
```

This will prompt you to log in, deploy your schema, generate `convex/_generated/`, and print your deployment URL.

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Paste your NEXT_PUBLIC_CONVEX_URL
```

### 4. Set Convex Auth secret

```bash
npx convex env set AUTH_SECRET "$(openssl rand -base64 32)"
```

### 5. Run the web app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## CLI

```bash
cd cli && npm install && npm run build
npm link  # installs `tac` globally

tac login          # authenticate to your Convex backend
tac g              # create a new alias (interactive)
tac m              # browse messages (arrow keys, Enter, b/Esc)
tac d              # delete an alias and all its messages
```

---

## Deploy

`render.yaml` is included for one-click Render deployment. Set `NEXT_PUBLIC_CONVEX_URL` in the Render dashboard after creation.
