/**
 * Decides whether a hosted build should apply pending migrations.
 *
 * Deploys are automatic but `db:migrate` was manual, so merging a PR that adds
 * a migration shipped code expecting a column that did not exist yet. Running
 * migrations inside the build closes that gap: Vercel only shifts traffic once
 * the build succeeds, so the schema is always in place first.
 *
 * Previews are opt-in rather than automatic. A preview pointed at a Neon branch
 * wants its migrations; one that inherited the production connection string
 * must never migrate production as a side effect of opening a pull request.
 */

export type DeployEnv = {
  /** Vercel's deployment environment; absent outside Vercel. */
  vercelEnv?: string;
  /** Present only when a database is actually configured. */
  databaseUrl?: string;
  /** Opt-in for preview deployments backed by their own database branch. */
  allowPreview?: string;
};

export type MigrationPlan = { run: boolean; reason: string };

export function migrationPlan({
  vercelEnv,
  databaseUrl,
  allowPreview,
}: DeployEnv): MigrationPlan {
  if (!databaseUrl) {
    return { run: false, reason: "DATABASE_URL is not set" };
  }

  if (vercelEnv === "production") {
    return { run: true, reason: "production deployment" };
  }

  if (vercelEnv === "preview") {
    return allowPreview === "1"
      ? { run: true, reason: "preview deployment with RUN_MIGRATIONS_ON_PREVIEW=1" }
      : {
          run: false,
          reason:
            "preview deployment without RUN_MIGRATIONS_ON_PREVIEW=1 — set it only when previews use their own database branch",
        };
  }

  return {
    run: false,
    reason: vercelEnv
      ? `unrecognised VERCEL_ENV "${vercelEnv}"`
      : "not a Vercel deployment — run bun run db:migrate directly",
  };
}
