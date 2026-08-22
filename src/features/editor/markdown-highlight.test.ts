import { describe, expect, it } from "vitest";

import { highlightMarkdown, looksLikeMarkdown } from "./markdown-highlight";

describe("looksLikeMarkdown", () => {
  it.each([
    ["## Context", "heading"],
    ["- one\n- two", "bullet list"],
    ["1. first", "ordered list"],
    ["> quoted", "blockquote"],
    ["```ts\nconst a = 1;\n```", "fenced code"],
    ["see [docs](https://x.dev)", "link"],
    ["![alt](img.png)", "image"],
    ["some **bold** text", "strong"],
    ["call `render()` first", "inline code"],
    ["---", "thematic break"],
    ["| a | b |", "table row"],
  ])("detects %s (%s)", (input) => {
    expect(looksLikeMarkdown(input)).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["   \n  ", "whitespace"],
    ["Just a normal sentence.", "prose"],
    ["A hyphen - mid sentence is not a list.", "inline hyphen"],
    ["2 * 3 = 6", "lone asterisk"],
    ["He said hello.\nThen left.", "two plain lines"],
    ["price: $5-10", "hyphen in a range"],
  ])("rejects %s (%s)", (input) => {
    expect(looksLikeMarkdown(input)).toBe(false);
  });
});

describe("highlightMarkdown", () => {
  it("emits one token list per line", () => {
    expect(highlightMarkdown("a\nb\nc")).toHaveLength(3);
  });

  it("marks a blank line as empty so it still occupies a row", () => {
    expect(highlightMarkdown("a\n\nb")[1]).toEqual([]);
  });

  it("splits a heading into marker and text", () => {
    expect(highlightMarkdown("## Context")[0]).toEqual([
      { text: "## ", kind: "marker" },
      { text: "Context", kind: "heading" },
    ]);
  });

  it("treats everything inside a fence as code", () => {
    const lines = highlightMarkdown("```ts\n# not a heading\n```");
    expect(lines[1]).toEqual([{ text: "# not a heading", kind: "code" }]);
  });

  it("splits a link into label and target", () => {
    const kinds = highlightMarkdown("see [docs](https://x.dev)")[0].map((t) => t.kind);
    expect(kinds).toEqual(["plain", "link", "url"]);
  });
});
