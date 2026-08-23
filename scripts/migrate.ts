/** CLI entry point for `bun run db:migrate`. */
import { runMigrations } from "../src/db/migrate";

try {
  await runMigrations();
  console.log("Migrations applied successfully.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
