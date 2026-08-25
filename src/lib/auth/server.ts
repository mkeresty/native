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
  const cookieDomain =
    process.env.NEON_AUTH_COOKIE_DOMAIN ??
    (process.env.VERCEL_ENV === "production" ? ".editora.sh" : undefined);
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
  });
  return auth;
}
