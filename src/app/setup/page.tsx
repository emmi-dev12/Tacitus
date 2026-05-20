"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { spaceMono, syne } from "../landing-fonts";
import { storeConvexUrl, getStoredConvexUrl, clearConvexConfig } from "@/lib/convexConfig";

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------
type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  0: "WELCOME",
  1: "CONVEX ACCOUNT",
  2: "DEPLOY BACKEND",
  3: "AUTH CONFIG",
  4: "CONNECT",
};

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------
function Shell({ step, children }: { step: Step; children: React.ReactNode }) {
  return (
    <div
      className={`${spaceMono.variable} ${syne.variable}`}
      style={{
        minHeight: "100vh", background: "#080d14",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem", fontFamily: "var(--font-space-mono), monospace",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* scan-lines */}
      <div style={{ position: "fixed", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,140,0.008) 2px, rgba(0,255,140,0.008) 4px)", pointerEvents: "none", zIndex: 10 }} />
      {/* glow */}
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "600px", height: "600px", background: "radial-gradient(ellipse at center, rgba(0,255,140,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "520px", position: "relative", zIndex: 20 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.2em", color: "#00ff8c", marginBottom: "0.5rem" }}>◈ TACITUS</div>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.28em", color: "#2d4050" }}>DEPLOYMENT SETUP</div>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "2rem" }}>
          {([0, 1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              style={{
                flex: 1, height: "2px",
                background: s <= step ? "#00ff8c" : "rgba(0,255,140,0.12)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        <div style={{ border: "1px solid rgba(0,255,140,0.12)", background: "rgba(8,13,20,0.98)", padding: "2rem" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.25em", color: "#2d4050", marginBottom: "1.25rem" }}>
            STEP {step + 1} / 5 — {STEP_LABELS[step]}
          </div>
          {children}
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.58rem", letterSpacing: "0.14em", color: "#1a2a36" }}>
          AES-256-GCM · PBKDF2 600K · ZERO SERVER KNOWLEDGE
        </div>
      </div>
    </div>
  );
}

function NextBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "0.8rem",
        background: disabled ? "rgba(0,255,140,0.06)" : "#00ff8c",
        color: disabled ? "#2d4050" : "#080d14",
        border: disabled ? "1px solid rgba(0,255,140,0.1)" : "none",
        fontSize: "0.72rem", letterSpacing: "0.15em", fontFamily: "inherit", fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === "string" ? children : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <div style={{ position: "relative", marginBottom: "1rem" }}>
      <pre style={{
        background: "#050a10", border: "1px solid rgba(0,255,140,0.12)",
        padding: "0.9rem 2.5rem 0.9rem 0.9rem",
        fontSize: "0.72rem", color: "#00a060", lineHeight: 1.6,
        overflowX: "auto", margin: 0, wordBreak: "break-all", whiteSpace: "pre-wrap",
      }}>{children}</pre>
      {text && (
        <button
          type="button"
          onClick={copy}
          style={{
            position: "absolute", top: "0.5rem", right: "0.5rem",
            background: "none", border: "none", color: copied ? "#00ff8c" : "#2d4050",
            fontSize: "0.58rem", letterSpacing: "0.1em", fontFamily: "inherit",
            cursor: "pointer", transition: "color 0.15s",
          }}
        >
          {copied ? "✓" : "COPY"}
        </button>
      )}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer", marginBottom: "1rem" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#00ff8c", marginTop: "2px", flexShrink: 0 }}
      />
      <span style={{ fontSize: "0.65rem", color: "#4a6070", letterSpacing: "0.04em", lineHeight: 1.5 }}>
        {children}
      </span>
    </label>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.7rem", lineHeight: 1.75, color: "#4a6070", marginBottom: "1.25rem" }}>
      {children}
    </p>
  );
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "#00ff8c", textDecoration: "none", borderBottom: "1px solid rgba(0,255,140,0.3)" }}
    >
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Step 0 — Welcome
// ---------------------------------------------------------------------------
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <>
      <Body>
        Tacitus uses a <span style={{ color: "#c8d4e0" }}>bring-your-own-backend</span> model.
        Your data lives on your own Convex deployment — completely isolated, with no shared infrastructure.
        Nobody else can access your database or encryption keys.
      </Body>
      <Body>
        This wizard takes ~5 minutes. You will need a free{" "}
        <Anchor href="https://convex.dev">Convex</Anchor> account and{" "}
        <Anchor href="https://nodejs.org">Node.js</Anchor> installed.
      </Body>
      <div style={{ background: "rgba(0,255,140,0.04)", border: "1px solid rgba(0,255,140,0.1)", padding: "1rem", marginBottom: "1.5rem", fontSize: "0.65rem", color: "#4a8060", lineHeight: 1.6 }}>
        ◈ Your encryption key never leaves your browser.
        Convex only stores ciphertext. Even if someone compromised your Convex account, they could not read your messages.
      </div>
      <NextBtn onClick={onNext}>BEGIN SETUP →</NextBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Create Convex account
// ---------------------------------------------------------------------------
function StepConvexAccount({ onNext }: { onNext: () => void }) {
  const [done, setDone] = useState(false);

  return (
    <>
      <Body>
        Create a free <Anchor href="https://dashboard.convex.dev">Convex account</Anchor> and start a new project.
        Convex is free for personal use — no credit card required.
      </Body>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.18em", color: "#2d4050", marginBottom: "0.75rem" }}>STEPS</div>
        {[
          ["1", "Go to dashboard.convex.dev"],
          ["2", 'Sign up with GitHub or Google'],
          ["3", 'Click "New Project" → give it a name (e.g. tacitus)'],
        ].map(([n, label]) => (
          <div key={n} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.6rem", color: "#00a060", letterSpacing: "0.1em", flexShrink: 0, marginTop: "1px" }}>[{n}]</span>
            <span style={{ fontSize: "0.68rem", color: "#4a6070", lineHeight: 1.5 }}>{label}</span>
          </div>
        ))}
      </div>
      <Check checked={done} onChange={setDone}>
        I have a Convex account and created a project
      </Check>
      <NextBtn onClick={onNext} disabled={!done}>NEXT →</NextBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Deploy backend
// ---------------------------------------------------------------------------
function StepDeploy({ onNext }: { onNext: () => void }) {
  const [done, setDone] = useState(false);

  return (
    <>
      <Body>
        Clone the Tacitus repository and deploy the backend to your Convex project.
      </Body>
      <div style={{ background: "rgba(255,40,40,0.04)", border: "1px solid rgba(255,40,40,0.2)", padding: "0.85rem", marginBottom: "1rem", fontSize: "0.63rem", color: "#c04040", lineHeight: 1.6 }}>
        ⚠ <strong style={{ color: "#e06060" }}>Security:</strong> Only clone from the official Tacitus repository below.
        Never run <code style={{ color: "#c8d4e0" }}>npm install</code> on code from an untrusted source.
      </div>
      <Code>{`git clone https://github.com/emmi-dev12/GhostMail
cd GhostMail
npm install
npx convex deploy --prod`}</Code>
      <Body>
        When prompted, select the project you just created. The command will print your deployment URL — you will need it in the next step.
      </Body>
      <div style={{ background: "rgba(255,200,0,0.04)", border: "1px solid rgba(255,200,0,0.1)", padding: "0.85rem", marginBottom: "1.25rem", fontSize: "0.63rem", color: "#a08040", lineHeight: 1.6 }}>
        ⚠ Run <code style={{ color: "#c8d4e0" }}>npx convex deploy --prod</code> — not <code style={{ color: "#c8d4e0" }}>npx convex dev</code>.
        The dev command is for local development only.
      </div>
      <Check checked={done} onChange={setDone}>
        Backend deployed — I can see my deployment URL in the Convex dashboard
      </Check>
      <NextBtn onClick={onNext} disabled={!done}>NEXT →</NextBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Auth secret
// ---------------------------------------------------------------------------
function StepAuthSecret({ onNext }: { onNext: () => void }) {
  const [done, setDone] = useState(false);

  return (
    <>
      <Body>
        Set the auth secret in your Convex deployment. Run this command in the Tacitus project directory:
      </Body>
      <Code>{`npx convex env set AUTH_SECRET "$(openssl rand -base64 32)" --prod`}</Code>
      <Body>
        Alternatively, set it via the Convex dashboard:
        <br />Dashboard → Your project → Settings → Environment Variables → Add <code style={{ color: "#c8d4e0" }}>AUTH_SECRET</code>
      </Body>
      <div style={{ background: "rgba(0,255,140,0.04)", border: "1px solid rgba(0,255,140,0.1)", padding: "0.85rem", marginBottom: "1.25rem", fontSize: "0.63rem", color: "#4a8060", lineHeight: 1.6 }}>
        ◈ Use a strong random value. This secret signs auth tokens for your deployment.
        Never share it or commit it to version control.
      </div>
      <Check checked={done} onChange={setDone}>
        AUTH_SECRET is set in my Convex deployment
      </Check>
      <NextBtn onClick={onNext} disabled={!done}>NEXT →</NextBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Enter URL & save
// ---------------------------------------------------------------------------
function StepConnect({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    try {
      storeConvexUrl(url);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid URL");
    }
  };

  return (
    <>
      <Body>
        Find your deployment URL in the Convex dashboard under your project → Deployment Settings.
        It looks like: <code style={{ color: "#c8d4e0", fontSize: "0.7rem" }}>https://your-project-name.convex.cloud</code>
      </Body>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2d4050", marginBottom: "0.4rem" }}>
          DEPLOYMENT URL
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="https://your-project.convex.cloud"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#050a10",
            border: `1px solid ${focused ? "rgba(0,255,140,0.4)" : error ? "rgba(255,68,85,0.4)" : "rgba(0,255,140,0.1)"}`,
            padding: "0.65rem 0.75rem",
            fontSize: "0.8rem", fontFamily: "var(--font-space-mono), monospace",
            color: "#c8d4e0", outline: "none",
            transition: "border-color 0.15s",
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: "0.7rem", color: "#ff4455", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>
          ✕ {error}
        </div>
      )}

      <NextBtn onClick={handleSave} disabled={!url.trim()}>
        SAVE & CONTINUE →
      </NextBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Done screen
// ---------------------------------------------------------------------------
function Done({ onGo }: { onGo: () => void }) {
  return (
    <Shell step={4}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", color: "#00ff8c", marginBottom: "1rem" }}>◈</div>
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "#00ff8c", marginBottom: "0.75rem" }}>
          DEPLOYMENT CONFIGURED
        </div>
        <div style={{ fontSize: "0.68rem", color: "#4a6070", lineHeight: 1.7, marginBottom: "2rem" }}>
          Your Convex backend is connected. You can now create your account.
        </div>
        <NextBtn onClick={onGo}>CONTINUE TO SIGN IN →</NextBtn>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Reconfigure mode — shown when already configured
// ---------------------------------------------------------------------------
function ReconfigurePrompt({ onContinue, onReconfigure }: { onContinue: () => void; onReconfigure: () => void }) {
  return (
    <Shell step={4}>
      <Body>
        A Convex deployment is already configured. You can continue with the existing configuration or replace it.
      </Body>
      <div style={{ background: "rgba(255,200,0,0.04)", border: "1px solid rgba(255,200,0,0.1)", padding: "0.85rem", marginBottom: "1.5rem", fontSize: "0.63rem", color: "#a08040", lineHeight: 1.6 }}>
        ⚠ Replacing the deployment URL will log you out and disconnect your current database.
        Your encrypted data stays in the old Convex project — it will not be migrated.
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <NextBtn onClick={onContinue}>USE EXISTING →</NextBtn>
        <button
          type="button"
          onClick={onReconfigure}
          style={{
            flex: 1, padding: "0.8rem",
            background: "transparent", color: "#4a6070",
            border: "1px solid rgba(0,255,140,0.15)",
            fontSize: "0.68rem", letterSpacing: "0.12em", fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          REPLACE
        </button>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------
export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step | "done" | "reconfigure" | "loading">("loading");

  useEffect(() => {
    const existing = getStoredConvexUrl();
    setStep(existing ? "reconfigure" : 0);
  }, []);

  const next = () => setStep((s) => (typeof s === "number" ? Math.min(s + 1, 4) as Step : s));

  if (step === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#080d14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff8c", opacity: 0.7 }} />
      </div>
    );
  }

  if (step === "reconfigure") {
    return (
      <ReconfigurePrompt
        onContinue={() => router.replace("/landing")}
        onReconfigure={() => { clearConvexConfig(); setStep(0); }}
      />
    );
  }

  if (step === "done") {
    return <Done onGo={() => router.replace("/auth")} />;
  }

  return (
    <Shell step={step}>
      {step === 0 && <StepWelcome onNext={next} />}
      {step === 1 && <StepConvexAccount onNext={next} />}
      {step === 2 && <StepDeploy onNext={next} />}
      {step === 3 && <StepAuthSecret onNext={next} />}
      {step === 4 && <StepConnect onDone={() => setStep("done")} />}
    </Shell>
  );
}
