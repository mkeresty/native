import { describe, expect, it } from "vitest";

import { getAuthPageHref, getSafeCallbackPath } from "./redirects";

describe("getSafeCallbackPath", () => {
  it("keeps a local app destination", () => {
    expect(getSafeCallbackPath("/app/join/invite-token")).toBe(
      "/app/join/invite-token",
    );
  });

  it("rejects external, protocol-relative, and backslash destinations", () => {
    expect(getSafeCallbackPath("https://example.com")).toBe("/app");
    expect(getSafeCallbackPath("//example.com")).toBe("/app");
    expect(getSafeCallbackPath("/\\example.com")).toBe("/app");
  });
});

describe("getAuthPageHref", () => {
  it("carries a non-default local destination between auth screens", () => {
    expect(getAuthPageHref("/sign-up", "/app/join/invite-token")).toBe(
      "/sign-up?next=%2Fapp%2Fjoin%2Finvite-token",
    );
  });

  it("does not add a default or unsafe destination", () => {
    expect(getAuthPageHref("/sign-in", "/app")).toBe("/sign-in");
    expect(getAuthPageHref("/sign-in", "//example.com")).toBe("/sign-in");
  });
});
