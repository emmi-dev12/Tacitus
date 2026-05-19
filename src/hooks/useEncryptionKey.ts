"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  deriveKey,
  generateSalt,
  exportKeyAsRecoveryCode,
  importKeyFromRecoveryCode,
  createSentinel,
  verifySentinel,
} from "@/lib/crypto";
import { setKey, getKey, clearKey, hasKey } from "@/lib/keyStore";

export type KeyStatus = "loading" | "needs_setup" | "needs_unlock" | "unlocked";

export function useEncryptionKey() {
  const [status, setStatus] = useState<KeyStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery(api.users.getProfile);
  const setProfileMutation = useMutation(api.users.setProfile);

  useEffect(() => {
    if (profile === undefined) return; // still loading
    if (hasKey()) { setStatus("unlocked"); return; }
    if (profile === null) {
      setStatus("needs_setup");
    } else {
      setStatus("needs_unlock");
    }
  }, [profile]);

  const setup = useCallback(
    async (passphrase: string): Promise<string> => {
      const salt = generateSalt();
      const key = await deriveKey(passphrase, salt);
      const sentinel = await createSentinel(key);
      const recoveryCode = await exportKeyAsRecoveryCode(passphrase, salt);

      await setProfileMutation({
        pbkdf2Salt: salt,
        encryptedSentinel: sentinel.encryptedSentinel,
        sentinelIv: sentinel.sentinelIv,
      });

      setKey(key);
      setStatus("unlocked");
      return recoveryCode;
    },
    [setProfileMutation],
  );

  const unlock = useCallback(
    async (passphrase: string): Promise<void> => {
      if (!profile) throw new Error("No profile found");
      const key = await deriveKey(passphrase, profile.pbkdf2Salt);

      // Verify passphrase is correct before accepting
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

    // Still verify the sentinel with the recovered key
    const valid = await verifySentinel(
      { encryptedSentinel: profile.encryptedSentinel, sentinelIv: profile.sentinelIv },
      key,
    );
    if (!valid) throw new Error("Recovery code does not match this account");

    setKey(key);
    setStatus("unlocked");
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

  return { status, error, setup, unlock, unlockWithRecovery, getKey: getKeyOrThrow, logout };
}
