import { describe, expect, it } from "vitest";

import { autoIndent } from "./code-indent";

/** Renders the caret as "|" so expectations read like the editor looks. */
function show(text: string, caret: number) {
  return `${text.slice(0, caret)}|${text.slice(caret)}`;
}

function enter(text: string, start: number, end = start) {
  const result = autoIndent(text, start, end);
  return show(result.text, result.caret);
}

describe("autoIndent", () => {
  it("adds a plain newline on an unindented line", () => {
    expect(enter("abc", 3)).toBe("abc\n|");
  });

  it("carries the current line's indentation", () => {
    expect(enter("    abc", 7)).toBe("    abc\n    |");
  });

  it("indents the body of a python block", () => {
    expect(enter("def f():", 8)).toBe("def f():\n  |");
  });

  it("indents relative to an already indented python line", () => {
    expect(enter("  if x:", 7)).toBe("  if x:\n    |");
  });

  it("indents after a brace, bracket or paren", () => {
    expect(enter("function f() {", 14)).toBe("function f() {\n  |");
    expect(enter("const a = [", 11)).toBe("const a = [\n  |");
    expect(enter("call(", 5)).toBe("call(\n  |");
  });

  it("opens a block out when the closer follows the caret", () => {
    expect(enter("function f() {}", 14)).toBe("function f() {\n  |\n}");
  });

  it("returns the closer to the opening line's indent", () => {
    expect(enter("  if (x) {}", 10)).toBe("  if (x) {\n    |\n  }");
  });

  it("ignores a closer that does not match the opener", () => {
    expect(enter("a = [)", 5)).toBe("a = [\n  |)");
  });

  it("splits mid-line and carries the indent", () => {
    expect(enter("  ab cd", 5)).toBe("  ab \n  |cd");
  });

  it("keeps the indent of a whitespace-only line", () => {
    expect(enter("    ", 4)).toBe("    \n    |");
  });

  it("does not treat a trailing colon mid-word as an opener", () => {
    expect(enter("ratio 3:4", 9)).toBe("ratio 3:4\n|");
  });

  it("replaces a selection before indenting", () => {
    expect(enter("abcdef", 1, 4)).toBe("a\n|ef");
  });

  it("indents from the line the selection starts on", () => {
    expect(enter("  keep this", 6, 11)).toBe("  keep\n  |");
  });

  it("handles a caret inside the leading whitespace", () => {
    expect(enter("    abc", 2)).toBe("  \n  |  abc");
  });

  it("respects a custom indent unit", () => {
    const result = autoIndent("def f():", 8, 8, "\t");
    expect(show(result.text, result.caret)).toBe("def f():\n\t|");
  });
});
