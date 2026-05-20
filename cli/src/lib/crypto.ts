// Node.js AES-256-GCM — identical algorithm to the browser Web Crypto layer.
// Tag layout: Web Crypto appends the 16-byte auth tag after the ciphertext.
// Node.js crypto does NOT append the tag automatically — we do it explicitly.
// Both sides use: [ciphertext bytes] + [16-byte auth tag], base64-encoded.
import { createDecipheriv, pbkdf2, randomBytes, createCipheriv } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

const ITERATIONS = 600_000;
const DIGEST = "sha256";
const KEY_LEN = 32; // 256-bit
const IV_LEN = 12;  // 96-bit for GCM
const TAG_LEN = 16; // 128-bit auth tag
const ALG = "aes-256-gcm";

export async function deriveKey(passphrase: string, saltBase64: string): Promise<Buffer> {
  const salt = Buffer.from(saltBase64, "base64");
  return pbkdf2Async(passphrase, salt, ITERATIONS, KEY_LEN, DIGEST);
}

export function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string } {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Tag is appended after ciphertext — matches Web Crypto's layout
  const combined = Buffer.concat([encrypted, tag]);
  return { ciphertext: combined.toString("base64"), iv: iv.toString("base64") };
}

export function decrypt(ciphertextBase64: string, ivBase64: string, key: Buffer): string {
  const combined = Buffer.from(ciphertextBase64, "base64");
  // Web Crypto appends the 16-byte GCM auth tag at the end of ciphertext
  const ciphertext = combined.subarray(0, combined.length - TAG_LEN);
  const tag = combined.subarray(combined.length - TAG_LEN);
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");
}

const SENTINEL = "tacitus-v1";

export function verifySentinel(
  encryptedSentinel: string,
  sentinelIv: string,
  key: Buffer,
): boolean {
  try {
    const plain = decrypt(encryptedSentinel, sentinelIv, key);
    // Constant-time comparison
    const a = Buffer.from(plain, "utf-8");
    const b = Buffer.from(SENTINEL, "utf-8");
    if (a.length !== b.length) return false;
    return a.equals(b); // Node.js Buffer.equals is constant-time
  } catch {
    return false;
  }
}
