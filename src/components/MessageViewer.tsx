"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { detectSensitiveContent, sanitizeEmailHtml } from "@/lib/sanitize";
import { useState } from "react";

interface DecryptedMessage {
  id: Id<"messages">;
  from: string;
  subject: string;
  bodyPlain: string;
  bodyHtml: string;
  receivedAt: number;
}

interface Props {
  message: DecryptedMessage;
  onDelete?: () => void;
}

// Strip Unicode bidi override characters that can visually reorder text (homograph attacks)
const BIDI_RE = /[‎‏‪-‮⁦-⁩؜]/g;
function sanitizeDisplayText(text: string, maxLen = 256): string {
  return text.replace(BIDI_RE, "").slice(0, maxLen);
}

export function MessageViewer({ message, onDelete }: Props) {
  const [viewHtml, setViewHtml] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const safeHtml = sanitizeEmailHtml(message.bodyHtml);
  const warnings = detectSensitiveContent(message.bodyPlain, safeHtml);
  const displayFrom = sanitizeDisplayText(message.from);
  const displaySubject = sanitizeDisplayText(message.subject);

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    await deleteMessage({ messageId: message.id });
    onDelete?.();
  };

  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'none'; script-src 'none'; img-src 'none'; connect-src 'none';">
</head>
<body>${safeHtml}</body>
</html>`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1E293B] px-6 py-4 space-y-1">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-white leading-tight">{displaySubject}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setViewHtml(!viewHtml)}
              className="rounded px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            >
              {viewHtml ? "plain text" : "html"}
            </button>
            <button
              onClick={handleDelete}
              className={`rounded px-2 py-1 text-[10px] transition ${
                confirming
                  ? "bg-red-900 text-red-300"
                  : "text-slate-500 hover:bg-slate-800 hover:text-red-400"
              }`}
            >
              {confirming ? "confirm delete?" : "delete"}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          <span className="text-slate-400">{displayFrom}</span>
          {" · "}
          {new Date(message.receivedAt).toLocaleString()}
        </p>
      </div>

      {/* Sensitive content warning */}
      {warnings.length > 0 && (
        <div className="border-b border-yellow-800/40 bg-yellow-950/20 px-6 py-2">
          <p className="text-xs text-yellow-400">
            Potential sensitive content detected: {warnings.map((w) => w.name).join(", ")}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {viewHtml && message.bodyHtml ? (
          <iframe
            sandbox=""
            srcDoc={srcDoc}
            className="h-full w-full border-0 bg-transparent"
            title="Email content"
          />
        ) : (
          <pre className="h-full overflow-y-auto p-6 text-xs text-slate-300 whitespace-pre-wrap font-mono">
            {message.bodyPlain.replace(BIDI_RE, "").slice(0, 100_000) || "(No plain text content)"}
            {message.bodyPlain.length > 100_000 && (
              `\n\n… ${message.bodyPlain.length - 100_000} more characters truncated`
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
