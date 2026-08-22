import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Ada's Workspace")).toBe("ada-s-workspace");
  });

  it("strips diacritics and symbols", () => {
    expect(slugify("Café — Notes & Ideas!")).toBe("cafe-notes-ideas");
  });

  it("falls back when empty", () => {
    expect(slugify("***")).toBe("workspace");
  });
});
