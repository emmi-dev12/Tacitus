"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { spaceMono, syne } from "../landing-fonts";
import { storeConvexUrl, getStoredConvexUrl } from "@/lib/convexConfig";

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
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.28em", color: "#4a7060" }}>DEPLOYMENT SETUP</div>
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
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "#5a8070", marginBottom: "1.25rem" }}>
            STEP {step + 1} / 5 — {STEP_LABELS[step]}
          </div>
          {children}
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.62rem", letterSpacing: "0.14em", color: "#3a5548" }}>
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
        color: disabled ? "#4a7060" : "#080d14",
        border: disabled ? "1px solid rgba(0,255,140,0.2)" : "none",
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
        fontSize: "0.75rem", color: "#00cc70", lineHeight: 1.6,
        overflowX: "auto", margin: 0, wordBreak: "break-all", whiteSpace: "pre-wrap",
      }}>{children}</pre>
      {text && (
        <button
          type="button"
          onClick={copy}
          style={{
            position: "absolute", top: "0.5rem", right: "0.5rem",
            background: "none", border: "none", color: copied ? "#00ff8c" : "#4a7060",
            fontSize: "0.62rem", letterSpacing: "0.1em", fontFamily: "inherit",
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
      <span style={{ fontSize: "0.75rem", color: "#8ab0c0", letterSpacing: "0.02em", lineHeight: 1.5 }}>
        {children}
      </span>
    </label>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.8rem", lineHeight: 1.75, color: "#8ab0c0", marginBottom: "1.25rem" }}>
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
        <Anchor href="https://convex.dev">Convex account</Anchor> — no technical knowledge required.
      </Body>
      <div style={{ background: "rgba(0,255,140,0.04)", border: "1px solid rgba(0,255,140,0.15)", padding: "1rem", marginBottom: "1.5rem", fontSize: "0.75rem", color: "#7abf9a", lineHeight: 1.6 }}>
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
        Create a free <Anchor href="https://dashboard.convex.dev">Convex account</Anchor>.
        Convex is free for personal use — no credit card required.
        The next step will automatically create and deploy your project.
      </Body>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: "#5a8070", marginBottom: "0.75rem" }}>STEPS</div>
        {[
          ["1", "Go to dashboard.convex.dev"],
          ["2", "Sign up with GitHub or Google"],
        ].map(([n, label]) => (
          <div key={n} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.65rem", color: "#00cc70", letterSpacing: "0.1em", flexShrink: 0, marginTop: "1px" }}>[{n}]</span>
            <span style={{ fontSize: "0.8rem", color: "#8ab0c0", lineHeight: 1.5 }}>{label}</span>
          </div>
        ))}
      </div>
      <Check checked={done} onChange={setDone}>
        I have a Convex account
      </Check>
      <NextBtn onClick={onNext} disabled={!done}>NEXT →</NextBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Deploy backend (one-click)
// ---------------------------------------------------------------------------
const DEPLOY_URL = "https://dashboard.convex.dev/new?template=https://github.com/emmi-dev12/Tacitus";

function StepDeploy({ onNext }: { onNext: () => void }) {
  const [done, setDone] = useState(false);

  return (
    <>
      <Body>
        Click the button below to deploy Tacitus to your Convex account. Convex will handle everything automatically — no terminal needed.
      </Body>
      <a
        href={DEPLOY_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block", width: "100%", boxSizing: "border-box",
          padding: "0.9rem", marginBottom: "1.25rem",
          background: "#00ff8c", color: "#080d14",
          fontSize: "0.72rem", letterSpacing: "0.15em", fontWeight: 700,
          textAlign: "center", textDecoration: "none",
          clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))",
        }}
      >
        DEPLOY TO CONVEX ↗
      </a>
      <Body>
        After the deployment finishes, Convex will show your project dashboard. Keep that tab open — you will need it in the next step.
      </Body>
      <Check checked={done} onChange={setDone}>
        Deployment is done — I can see my project in the Convex dashboard
      </Check>
      <NextBtn onClick={onNext} disabled={!done}>NEXT →</NextBtn>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Auth secret (browser-generated, no terminal)
// ---------------------------------------------------------------------------
const SESSION_SECRET_KEY = "tacitus_setup_auth_secret";

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getOrCreateSecret(): string {
  const stored = sessionStorage.getItem(SESSION_SECRET_KEY);
  if (stored) return stored;
  const fresh = generateSecret();
  sessionStorage.setItem(SESSION_SECRET_KEY, fresh);
  return fresh;
}

function StepAuthSecret({ onNext }: { onNext: () => void }) {
  const [secret] = useState(() => getOrCreateSecret());
  const [done, setDone] = useState(false);

  return (
    <>
      <Body>
        Your backend needs a secret key to sign login tokens. We have generated one for you — just copy it and paste it into the Convex dashboard.
      </Body>

      <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: "#5a8070", marginBottom: "0.5rem" }}>
        YOUR AUTH_SECRET
      </div>
      <Code>{secret}</Code>

      <Body>
        Open your Convex project dashboard, then go to{" "}
        <span style={{ color: "#c8d4e0" }}>Settings → Environment Variables</span> and add a variable named{" "}
        <code style={{ color: "#c8d4e0" }}>AUTH_SECRET</code> with the value above.
      </Body>

      <a
        href="https://dashboard.convex.dev"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block", width: "100%", boxSizing: "border-box",
          padding: "0.75rem", marginBottom: "1.25rem",
          background: "transparent", color: "#00ff8c",
          border: "1px solid rgba(0,255,140,0.3)",
          fontSize: "0.68rem", letterSpacing: "0.12em",
          textAlign: "center", textDecoration: "none",
        }}
      >
        OPEN CONVEX DASHBOARD ↗
      </a>

      <div style={{ background: "rgba(0,255,140,0.04)", border: "1px solid rgba(0,255,140,0.15)", padding: "0.85rem", marginBottom: "1.25rem", fontSize: "0.75rem", color: "#7abf9a", lineHeight: 1.6 }}>
        ◈ This secret only exists here — copy it now. You will not need to store it anywhere else.
      </div>

      <Check checked={done} onChange={setDone}>
        I added AUTH_SECRET in the Convex dashboard
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
      sessionStorage.removeItem(SESSION_SECRET_KEY);
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
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "#5a8070", marginBottom: "0.4rem" }}>
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
        <div style={{ fontSize: "0.8rem", color: "#8ab0c0", lineHeight: 1.7, marginBottom: "2rem" }}>
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
      <div style={{ background: "rgba(255,200,0,0.04)", border: "1px solid rgba(255,200,0,0.15)", padding: "0.85rem", marginBottom: "1.5rem", fontSize: "0.75rem", color: "#c8a040", lineHeight: 1.6 }}>
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
            background: "transparent", color: "#8ab0c0",
            border: "1px solid rgba(0,255,140,0.2)",
            fontSize: "0.75rem", letterSpacing: "0.12em", fontFamily: "inherit",
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
        onReconfigure={() => setStep(0)}
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
