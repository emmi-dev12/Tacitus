"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  deriveKey,
  importKeyFromRecoveryCode,
  verifySentinel,
} from "@/lib/crypto";
import { setKey, getKey, clearKey, hasKey } from "@/lib/keyStore";
import { consumePendingPassphrase } from "@/lib/pendingPassphrase";

export type KeyStatus = "loading" | "needs_unlock" | "unlocked";

export function useEncryptionKey(isAuthenticated: boolean = false) {
  const [status, setStatus] = useState<KeyStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery(api.users.getProfile, isAuthenticated ? undefined : "skip");

  useEffect(() => {
    if (!isAuthenticated) return;
    if (profile === undefined) return; // still loading
    if (hasKey()) { setStatus("unlocked"); return; }
    setStatus("needs_unlock");
  }, [profile, isAuthenticated]);

  // Auto-unlock with passphrase carried from the sign-in navigation
  useEffect(() => {
    if (status !== "needs_unlock" || !profile) return;
    const pending = consumePendingPassphrase();
    if (!pending) return;
    deriveKey(pending, profile.pbkdf2Salt)
      .then((key) =>
        verifySentinel(
          { encryptedSentinel: profile.encryptedSentinel, sentinelIv: profile.sentinelIv },
          key,
        ).then((valid) => {
          if (valid) { setKey(key); setStatus("unlocked"); }
        })
      )
      .catch(() => { /* fall through to manual unlock screen */ });
  }, [status, profile]);

  const unlock = useCallback(
    async (passphrase: string): Promise<void> => {
      if (!profile) throw new Error("No profile found");
      const key = await deriveKey(passphrase, profile.pbkdf2Salt);
      const valid = await verifySentinel(
        { encryptedSentinel: profile.encryptedSentinel, sentinelIv: profile.sentinelIv },
        key,
      );
      if (!valid) throw new Error("Incorrect passphrase");
      setKey(key);
      setStatus("unlocked");
      setError(null);
    },
    [profile],
  );

  const unlockWithRecovery = useCallback(async (recoveryCode: string): Promise<void> => {
    const key = await importKeyFromRecoveryCode(recoveryCode);
    if (!profile) throw new Error("No profile found");
    const valid = await verifySentinel(
      { encryptedSentinel: profile.encryptedSentinel, sentinelIv: profile.sentinelIv },
      key,
    );
    if (!valid) throw new Error("Recovery code does not match this account");
    setKey(key);
    setStatus("unlocked");
    setError(null);
  }, [profile]);

  const getKeyOrThrow = useCallback((): CryptoKey => {
    const key = getKey();
    if (!key) throw new Error("Encryption key not loaded — please unlock first");
    return key;
  }, []);

  const logout = useCallback(() => {
    clearKey();
    setStatus("needs_unlock");
  }, []);

  return { status, error, unlock, unlockWithRecovery, getKey: getKeyOrThrow, logout };
}
