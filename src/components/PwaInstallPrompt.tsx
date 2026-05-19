'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS/iPadOS detection — userAgent for iPhone; maxTouchPoints for iPadOS 13+
    const ua = navigator.userAgent;
    const isIphone = /iphone|ipod/i.test(ua);
    const isIpadOs = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    const isIosSafari = (isIphone || isIpadOs) && /Safari/i.test(ua) && !/Chrome/i.test(ua);
    const isInStandalone = ('standalone' in navigator) && (navigator as { standalone?: boolean }).standalone;
    const alreadyDismissed = localStorage.getItem('pwa-ios-dismissed');
    if (isIosSafari && !isInStandalone && !alreadyDismissed) {
      setShowIosBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const dismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-ios-dismissed', '1');
    setShowIosBanner(false);
    setDeferredPrompt(null);
  };

  if (isDismissed) return null;

  if (deferredPrompt) {
    return (
      <div style={bannerStyle}>
        <span style={textStyle}>Install Tacitus for offline access</span>
        <button onClick={handleInstall} style={btnStyle}>Install</button>
        <button onClick={dismiss} style={closeStyle} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  if (showIosBanner) {
    return (
      <div style={bannerStyle}>
        <span style={textStyle}>
          Tap <strong style={{ color: '#00ff8c' }}>Share</strong> then{' '}
          <strong style={{ color: '#00ff8c' }}>Add to Home Screen</strong> to install
        </span>
        <button onClick={dismiss} style={closeStyle} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  return null;
}

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '1.25rem',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  background: '#0b1420',
  border: '1px solid rgba(0,255,140,0.2)',
  padding: '0.75rem 1.25rem',
  zIndex: 100,
  maxWidth: 'calc(100vw - 2.5rem)',
  boxShadow: '0 0 40px rgba(0,255,140,0.06), 0 8px 32px rgba(0,0,0,0.6)',
  clipPath: 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))',
};

const textStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: '0.72rem',
  color: '#7a9aaa',
  letterSpacing: '0.04em',
  flex: 1,
};

const btnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#080d14',
  background: '#00ff8c',
  border: 'none',
  padding: '0.4rem 0.9rem',
  cursor: 'pointer',
  flexShrink: 0,
};

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2d4050',
  cursor: 'pointer',
  fontSize: '0.8rem',
  padding: '0.25rem',
  flexShrink: 0,
  lineHeight: 1,
};
