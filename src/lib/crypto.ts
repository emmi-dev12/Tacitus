"use client";

// All crypto operations run client-side only. Key never leaves the browser.
// AES-GCM: each encrypt call generates its own random 12-byte IV (never shared).

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_HASH = "SHA-256";
const KEY_LENGTH = 256;
const AES_MODE = "AES-GCM";
const IV_BYTES = 12;
const SALT_BYTES = 32;
const SENTINEL = "tacitus-v1";

// ── Key derivation ──────────────────────────────────────────────────────────

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return uint8ToBase64(bytes);
}

export async function deriveKey(
  passphrase: string,
  saltBase64: string,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const salt = base64ToUint8(saltBase64).buffer.slice(0) as ArrayBuffer;
  // non-extractable: key material cannot be read out of the CryptoKey object
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    baseKey,
    { name: AES_MODE, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Recovery code: an exportable copy of the operational key material ─────────
// We never make the operational key extractable. Instead we re-derive it with
// the same parameters but extractable:true, then export the raw bytes.
// The recovery code IS the operational key — importing it produces a key that
// can decrypt all existing messages.

async function deriveExportableKey(passphrase: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const salt = base64ToUint8(saltBase64).buffer.slice(0) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    baseKey,
    { name: AES_MODE, length: KEY_LENGTH },
    true,  // extractable — only used to export bytes into the recovery code
    ["encrypt", "decrypt"],
  );
}

export async function exportKeyAsRecoveryCode(
  passphrase: string,
  saltBase64: string,
): Promise<string> {
  const exportable = await deriveExportableKey(passphrase, saltBase64);
  const raw = await crypto.subtle.exportKey("raw", exportable);
  return uint8ToBase64(new Uint8Array(raw));
}

export async function importKeyFromRecoveryCode(
  recoveryCode: string,
): Promise<CryptoKey> {
  const raw = base64ToUint8(recoveryCode).buffer.slice(0) as ArrayBuffer;
  // non-extractable after import — recovery key becomes operational key
  return crypto.subtle.importKey("raw", raw, AES_MODE, false, [
    "encrypt",
    "decrypt",
  ]);
}

// ── Sentinel: used to verify a passphrase is correct before accepting it ─────

export interface SentinelPair {
  encryptedSentinel: string;
  sentinelIv: string;
}

export async function createSentinel(key: CryptoKey): Promise<SentinelPair> {
  const { ciphertext, iv } = await encrypt(SENTINEL, key);
  return { encryptedSentinel: ciphertext, sentinelIv: iv };
}

export async function verifySentinel(
  pair: SentinelPair,
  key: CryptoKey,
): Promise<boolean> {
  try {
    const plain = await decrypt(pair.encryptedSentinel, pair.sentinelIv, key);
    const enc = new TextEncoder();
    const a = enc.encode(plain);
    const b = enc.encode(SENTINEL);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch {
    return false;
  }
}

// ── Encrypt / Decrypt ───────────────────────────────────────────────────────

export interface Encrypted {
  ciphertext: string; // base64
  iv: string;         // base64
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<Encrypted> {
  const enc = new TextEncoder();
  const ivRaw = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const iv = ivRaw.buffer.slice(0) as ArrayBuffer;

  const cipherBuf = await crypto.subtle.encrypt(
    { name: AES_MODE, iv },
    key,
    enc.encode(plaintext),
  );

  return {
    ciphertext: uint8ToBase64(new Uint8Array(cipherBuf)),
    iv: uint8ToBase64(ivRaw),
  };
}

export async function decrypt(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey,
): Promise<string> {
  const ivBytes = base64ToUint8(ivBase64);
  const iv = ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer;
  const ctBytes = base64ToUint8(ciphertextBase64);
  const ct = ctBytes.buffer.slice(ctBytes.byteOffset, ctBytes.byteOffset + ctBytes.byteLength) as ArrayBuffer;
  const plainBuf = await crypto.subtle.decrypt({ name: AES_MODE, iv }, key, ct);
  return new TextDecoder().decode(plainBuf);
}

// ── Encrypt a message bundle — each field gets its own fresh IV ──────────────

export interface MessageEncrypted {
  encryptedFrom: string;
  ivFrom: string;
  encryptedSubject: string;
  ivSubject: string;
  encryptedBodyPlain: string;
  ivBodyPlain: string;
  encryptedBodyHtml: string;
  ivBodyHtml: string;
}

export async function encryptMessage(
  fields: { from: string; subject: string; bodyPlain: string; bodyHtml: string },
  key: CryptoKey,
): Promise<MessageEncrypted> {
  const [from, subject, bodyPlain, bodyHtml] = await Promise.all([
    encrypt(fields.from, key),
    encrypt(fields.subject, key),
    encrypt(fields.bodyPlain, key),
    encrypt(fields.bodyHtml, key),
  ]);
  return {
    encryptedFrom: from.ciphertext,
    ivFrom: from.iv,
    encryptedSubject: subject.ciphertext,
    ivSubject: subject.iv,
    encryptedBodyPlain: bodyPlain.ciphertext,
    ivBodyPlain: bodyPlain.iv,
    encryptedBodyHtml: bodyHtml.ciphertext,
    ivBodyHtml: bodyHtml.iv,
  };
}

export async function decryptMessage(
  enc: MessageEncrypted,
  key: CryptoKey,
): Promise<{ from: string; subject: string; bodyPlain: string; bodyHtml: string }> {
  const [from, subject, bodyPlain, bodyHtml] = await Promise.all([
    decrypt(enc.encryptedFrom, enc.ivFrom, key),
    decrypt(enc.encryptedSubject, enc.ivSubject, key),
    decrypt(enc.encryptedBodyPlain, enc.ivBodyPlain, key),
    decrypt(enc.encryptedBodyHtml, enc.ivBodyHtml, key),
  ]);
  return { from, subject, bodyPlain, bodyHtml };
}

// ── Base64 helpers ──────────────────────────────────────────────────────────

export function uint8ToBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}

export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
