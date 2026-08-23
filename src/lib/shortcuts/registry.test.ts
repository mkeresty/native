import { describe, expect, it } from "vitest";

import {
  formatShortcut,
  getShortcut,
  matchesShortcut,
  SHORTCUTS,
} from "./registry";

function keyEvent(
  overrides: Partial<{
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    key: string;
  }> = {},
) {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    key: "",
    ...overrides,
  };
}

describe("SHORTCUTS registry integrity", () => {
  it("has unique ids", () => {
    const ids = SHORTCUTS.map((shortcut) => shortcut.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never assigns the same combo to two active shortcuts", () => {
    const combos = SHORTCUTS.filter((s) => !s.displayOnly).map(
      (s) =>
        `${s.keys.mod ? "M" : ""}${s.keys.shift ? "S" : ""}${
          s.keys.alt ? "A" : ""
        }:${s.keys.key}`,
    );
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("covers every declared group with at least one entry", () => {
    const groups = new Set(SHORTCUTS.map((s) => s.group));
    expect(groups.has("General")).toBe(true);
    expect(groups.has("Documents")).toBe(true);
    expect(groups.has("Editor")).toBe(true);
    expect(groups.has("View")).toBe(true);
  });
});

describe("matchesShortcut", () => {
  const palette = getShortcut("palette"); // mod+k
  const redo = getShortcut("editorRedo"); // mod+shift+z
  const newDocument = getShortcut("newDocument"); // mod+alt+n

  it("matches when the platform modifier and key are held", () => {
    expect(matchesShortcut(keyEvent({ metaKey: true, key: "k" }), palette, true)).toBe(true);
    expect(matchesShortcut(keyEvent({ ctrlKey: true, key: "k" }), palette, false)).toBe(true);
  });

  it("ignores the non-platform modifier", () => {
    expect(matchesShortcut(keyEvent({ ctrlKey: true, key: "k" }), palette, true)).toBe(false);
    expect(matchesShortcut(keyEvent({ metaKey: true, key: "k" }), palette, false)).toBe(false);
  });

  it("does not fire when an extra modifier is held (⌘⇧K ≠ ⌘K)", () => {
    expect(
      matchesShortcut(keyEvent({ metaKey: true, shiftKey: true, key: "k" }), palette, true),
    ).toBe(false);
  });

  it("requires every declared modifier", () => {
    expect(matchesShortcut(keyEvent({ metaKey: true, key: "z" }), redo, true)).toBe(false);
    expect(
      matchesShortcut(keyEvent({ metaKey: true, shiftKey: true, key: "z" }), redo, true),
    ).toBe(true);
  });

  it("matches keys case-insensitively", () => {
    expect(matchesShortcut(keyEvent({ metaKey: true, key: "K" }), palette, true)).toBe(true);
  });

  it("handles alt modifiers independently of shift", () => {
    expect(
      matchesShortcut(keyEvent({ metaKey: true, altKey: true, key: "n" }), newDocument, true),
    ).toBe(true);
    expect(
      matchesShortcut(keyEvent({ metaKey: true, shiftKey: true, key: "n" }), newDocument, true),
    ).toBe(false);
  });
});

describe("formatShortcut", () => {
  it("renders symbols on macOS", () => {
    expect(formatShortcut("palette", true)).toBe("⌘K");
    expect(formatShortcut("signOut", true)).toBe("⌘⇧Q");
    expect(formatShortcut("newDocument", true)).toBe("⌘⌥N");
    expect(formatShortcut("toggleSidebar", true)).toBe("⌘\\");
  });

  it("renders word modifiers elsewhere", () => {
    expect(formatShortcut("palette", false)).toBe("Ctrl+K");
    expect(formatShortcut("signOut", false)).toBe("Ctrl+Shift+Q");
  });

  it("uppercases single-letter keys", () => {
    expect(formatShortcut("editorBold", true)).toBe("⌘B");
  });
});
