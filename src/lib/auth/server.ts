import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon hosts and operates the Better Auth server. We use its Next.js adapter
 * for the `/api/auth` proxy, signed session cache, and server-side sessions;
 * the application continues to render its own authentication UI.
 */
let auth: NeonAuth | undefined;

export function getAuth(): NeonAuth {
  if (auth) return auth;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  // Neon returns session cookies from its Auth host. On production, rewrite
  // them to Editora's canonical public domain so the browser accepts and
  // returns them after the OAuth callback. Preview and local deployments keep
  // host-only cookies for their own ephemeral domains.
  const cookieDomain =
    process.env.VERCEL_ENV === "production" ? "editora.sh" : undefined;
  if (!baseUrl || !cookieSecret) {
    throw new Error(
      "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.",
    );
  }

  auth = createNeonAuth({
    baseUrl,
    cookies: {
      secret: cookieSecret,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    },
    // Temporary production diagnostics for the OAuth session handoff. Neon
    // logs request paths and upstream statuses, not credentials or tokens.
    logLevel: "debug",
  });
  return auth;
}
