import Link from "next/link";
import { spaceMono, syne } from "./landing-fonts";
import s from "./landing.module.css";

export default function LandingPage() {
  return (
    <main className={`${s.landing} ${spaceMono.variable} ${syne.variable}`}>
      {/* Scan-line overlay */}
      <div className={s.scanlines} aria-hidden="true" />
      <div className={s.grain} aria-hidden="true" />

      {/* Top bar */}
      <header className={s.topbar}>
        <span className={s.logoMark}>◈ TACITUS</span>
        <nav className={s.topnav} aria-label="Main navigation">
          <Link href="/auth" className={s.navLink}>Sign in</Link>
          <Link href="/auth" className={s.btnPrimary}>Get access →</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className={s.hero}>
        <div className={s.heroTag}>SIGNALS · ENCRYPTED · EPHEMERAL</div>
        <h1 className={s.heroHeading}>
          <span className={s.heroLine}>SILENT</span>
          <span className={s.heroLineAccent}>MESSENGER</span>
        </h1>
        <p className={s.heroSub}>
          Disposable email aliases. End-to-end encrypted.
          Convex never sees plaintext. Your key lives only in your browser.
        </p>
        <div className={s.heroActions}>
          <Link href="/auth" className={s.ctaPrimary}>
            <span className={s.ctaBracket}>[</span>&nbsp;Create an alias&nbsp;<span className={s.ctaBracket}>]</span>
          </Link>
          <span className={s.ctaNote}>Free · No identity required</span>
        </div>

        {/* Terminal card — decorative, hidden from screen readers */}
        <div className={s.terminal} aria-hidden="true">
          <div className={s.terminalBar}>
            <span className={`${s.dot} ${s.dotRed}`} />
            <span className={`${s.dot} ${s.dotYellow}`} />
            <span className={`${s.dot} ${s.dotGreen}`} />
            <span className={s.terminalTitle}>tacitus — session</span>
          </div>
          <div className={s.terminalBody}>
            <p><span className={s.prompt}>$</span> tac alias create --label ghost-ops --ttl 24h</p>
            <p className={s.out}>✓ alias created <span className={s.accentText}>ghost-ops@mail.tm</span></p>
            <p className={`${s.out} ${s.dim}`}>  key derived via PBKDF2 · 600k iterations</p>
            <p className={`${s.out} ${s.dim}`}>  ciphertext stored · plaintext never leaves device</p>
            <p><span className={s.prompt}>$</span> tac messages --alias ghost-ops</p>
            <p className={s.out}>3 messages · AES-256-GCM · per-field IV</p>
            <p className={`${s.out} ${s.dim}`}>  decrypted locally · zero server knowledge</p>
            <p className={s.cursorLine}><span className={s.prompt}>$</span>&nbsp;<span className={s.blink} aria-hidden="true">█</span></p>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className={s.features}>
        <ul className={s.featureGrid}>
          <li className={s.featureCard}>
            <div className={s.featureIcon} aria-hidden="true">⬡</div>
            <h3>Zero Knowledge Backend</h3>
            <p>Convex stores only ciphertext. PBKDF2 key derivation happens in your browser. The server is blind.</p>
          </li>
          <li className={s.featureCard}>
            <div className={s.featureIcon} aria-hidden="true">⬡</div>
            <h3>Per-Field IV Encryption</h3>
            <p>Each field — From, Subject, Body — encrypted with its own random 12-byte IV. Nonce reuse is architecturally impossible.</p>
          </li>
          <li className={s.featureCard}>
            <div className={s.featureIcon} aria-hidden="true">⬡</div>
            <h3>Ephemeral Aliases</h3>
            <p>Disposable mail.tm addresses with configurable TTL. Nightly cleanup erases expired aliases and all associated ciphertext.</p>
          </li>
          <li className={s.featureCard}>
            <div className={s.featureIcon} aria-hidden="true">⬡</div>
            <h3>CLI Access</h3>
            <p>Full <code>tac</code> CLI via oclif + ink. Credentials in system keychain. Read and manage aliases from any terminal.</p>
          </li>
          <li className={s.featureCard}>
            <div className={s.featureIcon} aria-hidden="true">⬡</div>
            <h3>Sandboxed Rendering</h3>
            <p>HTML email in a hardened iframe — no <code>allow-same-origin</code>, no scripts, strict CSP. Tracking pixels blocked at the sanitizer.</p>
          </li>
          <li className={s.featureCard}>
            <div className={s.featureIcon} aria-hidden="true">⬡</div>
            <h3>Recovery Codes</h3>
            <p>Export your key as a recovery code. Lose your passphrase, not your messages. Key material is yours alone.</p>
          </li>
        </ul>
      </section>

      {/* Threat model */}
      <section className={s.threatSection}>
        <div className={s.threatInner}>
          <div className={s.threatLabel}>THREAT MODEL</div>
          <h2 className={s.threatHeading}>What Tacitus protects against</h2>
          <div className={s.threatColumns}>
            <div className={s.threatCol}>
              <div className={`${s.threatItem} ${s.threatItemProtected}`}>
                <span className={s.threatIcon} aria-hidden="true">✓</span>
                <div>
                  <strong>Server compromise</strong>
                  <p>Attacker owns the database — all they see is ciphertext blobs.</p>
                </div>
              </div>
              <div className={`${s.threatItem} ${s.threatItemProtected}`}>
                <span className={s.threatIcon} aria-hidden="true">✓</span>
                <div>
                  <strong>Subpoena / legal access</strong>
                  <p>We cannot hand over plaintext we do not have.</p>
                </div>
              </div>
              <div className={`${s.threatItem} ${s.threatItemProtected}`}>
                <span className={s.threatIcon} aria-hidden="true">✓</span>
                <div>
                  <strong>Email tracking pixels</strong>
                  <p>No external resources, no images, strict sanitizer allowlist.</p>
                </div>
              </div>
            </div>
            <div className={s.threatCol}>
              <div className={`${s.threatItem} ${s.threatItemNotProtected}`}>
                <span className={`${s.threatIcon} ${s.threatIconWarn}`} aria-hidden="true">!</span>
                <div>
                  <strong>Compromised client device</strong>
                  <p>Key lives in browser memory. Device-level security is your responsibility.</p>
                </div>
              </div>
              <div className={`${s.threatItem} ${s.threatItemNotProtected}`}>
                <span className={`${s.threatIcon} ${s.threatIconWarn}`} aria-hidden="true">!</span>
                <div>
                  <strong>Sender identity</strong>
                  <p>Tacitus protects your inbox, not the sender&apos;s metadata.</p>
                </div>
              </div>
              <div className={`${s.threatItem} ${s.threatItemNotProtected}`}>
                <span className={`${s.threatIcon} ${s.threatIconWarn}`} aria-hidden="true">!</span>
                <div>
                  <strong>Passphrase loss without backup</strong>
                  <p>Export a recovery code. We cannot reset your key.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className={s.footerCta}>
        <p className={s.footerCtaLabel}>READY TO GO DARK?</p>
        <Link href="/auth" className={`${s.ctaPrimary} ${s.ctaPrimaryLarge}`}>
          <span className={s.ctaBracket}>[</span>&nbsp;Start for free&nbsp;<span className={s.ctaBracket}>]</span>
        </Link>
        <p className={s.footerNote}>
          Open source ·{" "}
          <a
            href="https://github.com/emmi-dev12/Tacitus"
            className={s.footerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/emmi-dev12/Tacitus
          </a>
        </p>
      </section>
    </main>
  );
}
