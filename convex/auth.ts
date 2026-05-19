import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        // Enforce minimum password length server-side, not just in the browser
        if (
          params.flow === "signUp" &&
          typeof params.password === "string" &&
          params.password.length < 12
        ) {
          throw new Error("Password must be at least 12 characters");
        }
        return { email: params.email as string };
      },
    }),
  ],
});
