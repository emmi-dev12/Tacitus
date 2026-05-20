// One-time in-memory bridge for auto-unlock after sign-in.
// Avoids a second passphrase prompt when navigating from /auth to /inbox.
// Cleared on first read. Never persisted to storage.
let _passphrase: string | null = null;
let _timer: ReturnType<typeof setTimeout> | null = null;

export function setPendingPassphrase(p: string): void {
  if (_timer) clearTimeout(_timer); // cancel prior timer to avoid early clear on double-call
  _passphrase = p;
  _timer = setTimeout(() => { _passphrase = null; _timer = null; }, 10_000);
}

export function consumePendingPassphrase(): string | null {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  const p = _passphrase;
  _passphrase = null;
  return p;
}
