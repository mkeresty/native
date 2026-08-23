import { describe, expect, it } from "vitest";

import { resolveAuthBaseUrl } from "./base-url";

describe("resolveAuthBaseUrl", () => {
  it("uses the explicit URL in production", () => {
    expect(
      resolveAuthBaseUrl({
        betterAuthUrl: "https://native.app",
        vercelEnv: "production",
        vercelUrl: "native-xyz.vercel.app",
      }),
    ).toBe("https://native.app");
  });

  it("prefers the deployment URL on a preview, even if one was inherited", () => {
    expect(
      resolveAuthBaseUrl({
        betterAuthUrl: "https://native.app",
        vercelEnv: "preview",
        vercelUrl: "native-pr-42.vercel.app",
      }),
    ).toBe("https://native-pr-42.vercel.app");
  });

  it("falls back to the project domain when no custom domain is set", () => {
    expect(
      resolveAuthBaseUrl({
        vercelEnv: "production",
        vercelProductionUrl: "native.vercel.app",
      }),
    ).toBe("https://native.vercel.app");
  });

  it("returns undefined locally so Better Auth keeps its own default", () => {
    expect(resolveAuthBaseUrl({})).toBeUndefined();
  });

  it("still honours an explicit URL in local development", () => {
    expect(resolveAuthBaseUrl({ betterAuthUrl: "http://localhost:3000" })).toBe(
      "http://localhost:3000",
    );
  });

  it("never adopts the per-deployment URL outside a preview", () => {
    // VERCEL_URL is deployment-specific, so it is not the canonical production
    // origin even though it resolves to the same app.
    expect(
      resolveAuthBaseUrl({ vercelEnv: "production", vercelUrl: "native-xyz.vercel.app" }),
    ).toBeUndefined();
  });
});
