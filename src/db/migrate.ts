import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/** Applies every pending migration in ./drizzle, then closes the connection. */
export async function runMigrations(url = process.env.DATABASE_URL): Promise<void> {
  if (!url) throw new Error("DATABASE_URL is required.");

  // onnotice keeps "already exists, skipping" chatter out of deploy logs.
  const conn = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(conn), { migrationsFolder: "./drizzle" });
  } finally {
    await conn.end();
  }
}
