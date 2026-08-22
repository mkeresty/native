import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import { createDefaultWorkspace } from "@/lib/workspaces/server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // BETTER_AUTH_URL sets the canonical origin (production). In development the
  // app and the E2E suite run on different ports, so trust both explicitly.
  trustedOrigins: ["http://localhost:3000", "http://localhost:3100"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await createDefaultWorkspace(db, createdUser.id, createdUser.name);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
