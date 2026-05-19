// Minimal service worker — satisfies PWA installability criteria.
// This app handles cryptographic key material in the browser.
// We deliberately do NOT cache any HTML or JS to prevent stale-code
// injection attacks. All requests are served network-first.
// The SW only intercepts same-origin GET requests and never caches them.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Intentionally empty fetch handler — network-first, no caching.
// Registered solely to satisfy PWA manifest installability requirements.
