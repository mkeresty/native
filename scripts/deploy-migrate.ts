/**
 * Release step for hosted builds: apply pending migrations before Vercel
 * shifts traffic to the new deployment.
 *
 * Whether it runs at all is decided by `migrationPlan` — see that module for
 * why previews are opt-in.
 */
import { runMigrations } from "../src/db/migrate";
import { migrationPlan } from "../src/lib/deploy/migrations";

const plan = migrationPlan({
  vercelEnv: process.env.VERCEL_ENV,
  databaseUrl: process.env.DATABASE_URL,
  allowPreview: process.env.RUN_MIGRATIONS_ON_PREVIEW,
});

if (!plan.run) {
  console.log(`Skipping migrations: ${plan.reason}.`);
  process.exit(0);
}

console.log(`Applying migrations: ${plan.reason}.`);
try {
  await runMigrations();
  console.log("Migrations applied successfully.");
} catch (error) {
  // Fail the build rather than serving code against an unmigrated schema.
  console.error("Migration failed, aborting the deployment.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
