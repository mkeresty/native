import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { describe, expect, it } from "vitest";

const manager = new MarkdownManager({
  extensions: [StarterKit, TaskList, TaskItem],
});

function roundTrip(markdown: string): string {
  return manager.serialize(manager.parse(markdown));
}

describe("markdown round-trip", () => {
  it("preserves headings, emphasis, and inline code", () => {
    const md = [
      "# Architecture",
      "",
      "## Overview",
      "",
      "Our app uses **bold**, *italic*, ~~strike~~, and `inline_code()`.",
    ].join("\n");
    expect(roundTrip(md)).toBe(md);
  });

  it("preserves links", () => {
    const md = "See the [docs](https://example.com/guide) for details.";
    expect(roundTrip(md)).toBe(md);
  });

  it("preserves lists", () => {
    const md = ["- one", "- two", "", "1. first", "2. second"].join("\n");
    expect(roundTrip(md)).toBe(md);
  });

  it("preserves task lists", () => {
    expect(roundTrip("- [ ] todo")).toContain("- [ ] todo");
    expect(roundTrip("- [x] done")).toContain("- [x] done");
  });

  it("preserves blockquotes, fenced code, and horizontal rules", () => {
    const md = [
      "> quoted text",
      "",
      "```ts",
      'const x: number = 1;',
      "```",
      "",
      "---",
    ].join("\n");
    const output = roundTrip(md);
    for (const fragment of ["> quoted text", "```ts", "const x: number = 1;", "---"]) {
      expect(output).toContain(fragment);
    }
  });

  it("normalizes line endings into canonical output", () => {
    expect(roundTrip("# Heading\r\n\r\nBody text")).toBe(
      "# Heading\n\nBody text",
    );
  });

  it("round-trips an empty document", () => {
    const output = roundTrip("");
    expect(output.trim()).toBe("");
  });
});
