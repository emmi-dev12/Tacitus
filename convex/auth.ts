import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

const USERNAME_RE = /^[a-z0-9_-]+$/;

// Validates a username and builds a synthetic email for Convex Auth.
// Allowlist check runs on the raw (trimmed) input BEFORE any normalization
// to prevent Unicode→ASCII bypass (e.g. fullwidth ａｄｍｉｎ → admin).
export function usernameToEmail(raw: string): string {
  const username = raw.trim().toLowerCase();
  if (!username) throw new Error("Username is required");
  if (username.length < 3) throw new Error("Username must be at least 3 characters");
  if (username.length > 32) throw new Error("Username must be 32 characters or fewer");
  if (!USERNAME_RE.test(username)) {
    throw new Error("Username may only contain letters, numbers, hyphens, and underscores");
  }
  const email = `${username}@tacitus.local`;
  if ((email.match(/@/g) ?? []).length !== 1) throw new Error("Invalid username");
  return email;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        if (typeof params.password === "string") {
          if (params.flow === "signUp" && params.password.length < 12) {
            throw new Error("Password must be at least 12 characters");
          }
          if (params.password.length > 128) {
            throw new Error("Password must be 128 characters or fewer");
          }
        }
        const email = usernameToEmail(
          typeof params.username === "string" ? params.username : ""
        );
        return { email };
      },
    }),
  ],
});
