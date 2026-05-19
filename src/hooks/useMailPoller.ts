"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { decrypt, encryptMessage } from "@/lib/crypto";
import { listMessages, getMessage } from "@/lib/mailtm";
import { sanitizeEmailHtml } from "@/lib/sanitize";

const BASE_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 120_000;

interface AliasRecord {
  _id: Id<"aliases">;
  encryptedMailTmToken: string;
  tokenIv: string;
}

export interface PollerError {
  aliasId: string;
  message: string;
  at: number;
}

export function useMailPoller(
  aliases: AliasRecord[],
  getKey: () => CryptoKey,
  enabled: boolean,
) {
  const upsertMessage = useMutation(api.messages.upsertMessage);
  const [errors, setErrors] = useState<PollerError[]>([]);
  const intervalRef = useRef(BASE_INTERVAL_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || aliases.length === 0) return;

    let cancelled = false;

    const poll = async () => {
      const key = getKey();
      let hadError = false;

      for (const alias of aliases) {
        try {
          const token = await decrypt(alias.encryptedMailTmToken, alias.tokenIv, key);
          const messages = await listMessages(token);

          for (const msg of messages) {
            try {
              const full = await getMessage(msg.id, token);
              const bodyHtml = sanitizeEmailHtml(
                Array.isArray(full.html) ? full.html.join("") : (full.html ?? ""),
              );
              const MAX_FIELD = 64 * 1024; // 64 KB per field before encryption
              const encrypted = await encryptMessage(
                {
                  from: full.from.address.slice(0, 320),       // RFC-5321 max addr length
                  subject: (full.subject ?? "").slice(0, 998), // RFC-2822 subject limit
                  bodyPlain: (full.text ?? "").slice(0, MAX_FIELD),
                  bodyHtml: bodyHtml.slice(0, MAX_FIELD),
                },
                key,
              );
              await upsertMessage({
                aliasId: alias._id,
                mailTmId: full.id,
                ...encrypted,
                receivedAt: new Date(full.createdAt).getTime(),
              });
            } catch (e) {
              console.error(`[tacitus] message fetch error for alias ${alias._id}:`, e);
            }
          }
          // Success — reset backoff for this alias
        } catch (e) {
          hadError = true;
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[tacitus] poll error for alias ${alias._id}:`, e);
          setErrors((prev) => [
            ...prev.filter((x) => x.aliasId !== alias._id),
            { aliasId: alias._id, message: msg, at: Date.now() },
          ]);
        }
      }

      if (!cancelled) {
        if (hadError) {
          // Exponential backoff
          intervalRef.current = Math.min(intervalRef.current * 2, MAX_INTERVAL_MS);
        } else {
          intervalRef.current = BASE_INTERVAL_MS;
        }
        timerRef.current = setTimeout(poll, intervalRef.current);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [aliases, enabled, getKey, upsertMessage]);

  return { errors };
}
