import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const conn = postgres(url, { prepare: false, max: 1 });
try {
  await migrate(drizzle(conn), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
} finally {
  await conn.end();
}
