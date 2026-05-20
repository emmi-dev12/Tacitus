export const SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "NEXT_PUBLIC_CONVEX_URL is not configured.",
  "NEXT_PUBLIC_CONVEX_URL is not a valid URL.",
  "NEXT_PUBLIC_CONVEX_URL must use HTTPS.",
]);

export function safeMessage(error: Error): string {
  if (SAFE_MESSAGES.has(error.message)) return error.message;
  return "Configuration error — please reload the page or contact support.";
}
