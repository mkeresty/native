import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  // During `next build` no queries run; a placeholder keeps module evaluation
  // working without secrets present. Any real query without DATABASE_URL fails fast.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgres://build:build@localhost:5432/build";
  }
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and configure it.",
  );
}

const globalForDb = globalThis as unknown as { conn?: postgres.Sql };

export const conn =
  globalForDb.conn ??
  postgres(connectionString(), {
    prepare: false,
    max: 10,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
export { schema };
