/**
 * Resolves the origin Better Auth should treat as canonical.
 *
 * A single fixed BETTER_AUTH_URL cannot be correct everywhere: preview
 * deployments get a generated hostname, so a production value inherited by a
 * preview points auth callbacks and cookies at the wrong origin. Previews
 * therefore prefer their own deployment URL over any inherited value.
 */

export type AuthUrlEnv = {
  /** Explicit override; the custom production domain. */
  betterAuthUrl?: string;
  /** "production" | "preview" | "development" on Vercel, absent elsewhere. */
  vercelEnv?: string;
  /** Host of this specific deployment, generated for previews. */
  vercelUrl?: string;
  /** Host of the project's production deployment. */
  vercelProductionUrl?: string;
};

export function resolveAuthBaseUrl({
  betterAuthUrl,
  vercelEnv,
  vercelUrl,
  vercelProductionUrl,
}: AuthUrlEnv): string | undefined {
  // Deliberately ahead of betterAuthUrl: a preview that inherited the
  // production origin would otherwise authenticate against the wrong host.
  if (vercelEnv === "preview" && vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (betterAuthUrl) return betterAuthUrl;

  // No custom domain configured yet — fall back to the project's own domain.
  if (vercelProductionUrl) return `https://${vercelProductionUrl}`;

  // Local development: let Better Auth apply its own default.
  return undefined;
}
