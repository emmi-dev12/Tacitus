# GhostMail

Premium, open-source, local-first disposable email with E2E encryption.

## Stack

- **Email ingest**: [mail.tm](https://mail.tm) — free catch-all domains, no domain purchase needed
- **Backend + real-time sync**: [Convex](https://convex.dev)
- **Auth**: Convex Auth (email/password)
- **Frontend**: Next.js 15 + Tailwind CSS
- **CLI**: oclif + ink (React terminal UI)
- **E2E Encryption**: PBKDF2 (310k iterations) → AES-256-GCM, client-side only

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Initialize Convex

```bash
npx convex dev
```

This will:
- Prompt you to log in / create a Convex account
- Deploy your schema and functions
- Generate `convex/_generated/` (fixes all remaining TS errors)
- Print your deployment URL

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Paste your NEXT_PUBLIC_CONVEX_URL from step 2
```

### 4. Set Convex Auth secret

```bash
npx convex env set AUTH_SECRET "$(openssl rand -base64 32)"
```

### 5. Run the web app

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
