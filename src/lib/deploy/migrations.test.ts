import { describe, expect, it } from "vitest";

import { migrationPlan } from "./migrations";

const DB = "postgres://user:pw@host/db";

describe("migrationPlan", () => {
  it("runs on a production deployment", () => {
    expect(migrationPlan({ vercelEnv: "production", databaseUrl: DB }).run).toBe(true);
  });

  it("skips a preview by default, so a PR cannot migrate production", () => {
    expect(migrationPlan({ vercelEnv: "preview", databaseUrl: DB }).run).toBe(false);
  });

  it("runs on a preview that opted in", () => {
    expect(
      migrationPlan({ vercelEnv: "preview", databaseUrl: DB, allowPreview: "1" }).run,
    ).toBe(true);
  });

  it("ignores an opt-in value other than 1", () => {
    expect(
      migrationPlan({ vercelEnv: "preview", databaseUrl: DB, allowPreview: "true" }).run,
    ).toBe(false);
  });

  it("skips without a database, so local and CI builds are unaffected", () => {
    expect(migrationPlan({ vercelEnv: "production" }).run).toBe(false);
    expect(migrationPlan({}).run).toBe(false);
  });

  it("skips outside Vercel even with a database configured", () => {
    expect(migrationPlan({ databaseUrl: DB }).run).toBe(false);
  });

  it("skips an unrecognised environment rather than guessing", () => {
    const plan = migrationPlan({ vercelEnv: "staging", databaseUrl: DB });
    expect(plan.run).toBe(false);
    expect(plan.reason).toContain("staging");
  });

  it("always explains itself", () => {
    for (const env of [
      { vercelEnv: "production", databaseUrl: DB },
      { vercelEnv: "preview", databaseUrl: DB },
      {},
    ]) {
      expect(migrationPlan(env).reason.length).toBeGreaterThan(0);
    }
  });
});
