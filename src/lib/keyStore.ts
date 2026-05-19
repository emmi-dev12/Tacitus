"use client";

// The operational CryptoKey is non-extractable and lives only in memory.
// It is cleared when the page reloads — the user re-enters their passphrase.
// We never write key material to sessionStorage, localStorage, or any persistent store.

let memoryKey: CryptoKey | null = null;

export function setKey(key: CryptoKey): void {
  memoryKey = key;
}

export function getKey(): CryptoKey | null {
  return memoryKey;
}

export function clearKey(): void {
  memoryKey = null;
}

export function hasKey(): boolean {
  return memoryKey !== null;
}
