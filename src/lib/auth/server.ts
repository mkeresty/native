import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import { resolveAuthBaseUrl } from "@/lib/auth/base-url";
import { createDefaultWorkspace } from "@/lib/workspaces/server";

// Resolved per deployment: a preview must not authenticate against the
// production origin it inherited. See lib/auth/base-url.ts.
const baseURL = resolveAuthBaseUrl({
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  vercelEnv: process.env.VERCEL_ENV,
  vercelUrl: process.env.VERCEL_URL,
  vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  ...(baseURL ? { baseURL } : {}),
  // In development the app and the E2E suite run on different ports, so trust
  // both explicitly; the resolved origin covers every hosted deployment.
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3100",
    ...(baseURL ? [baseURL] : []),
  ],
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
