import { describe, expect, it } from "vitest";

import {
  insertBlock,
  setHeading,
  insertLink,
  surround,
  toggleLinePrefix,
  toggleFence,
  toggleOrderedList,
  toggleWrap,
} from "./markdown-commands";

/** Renders a selection as "before[selected]after" so cases read clearly. */
function show({ value, start, end }: { value: string; start: number; end: number }) {
  return `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;
}

describe("surround", () => {
  it("wraps the selection instead of replacing it", () => {
    expect(show(surround("make this bold", 5, 9, "*"))).toBe("make *[this]* bold");
  });

  it("keeps the inner text selected so presses nest into **", () => {
    const once = surround("make this bold", 5, 9, "*");
    expect(show(surround(once.value, once.start, once.end, "*"))).toBe(
      "make **[this]** bold",
    );
  });

  it("supports asymmetric pairs", () => {
    expect(show(surround("see docs", 4, 8, "[", "]"))).toBe("see [[docs]]");
  });

  it("wraps an empty selection as a bare pair", () => {
    expect(show(surround("ab", 1, 1, "`"))).toBe("a`[]`b");
  });
});

describe("toggleWrap", () => {
  it("adds delimiters when absent", () => {
    expect(show(toggleWrap("plain word", 6, 10, "**"))).toBe("plain **[word]**");
  });

  it("strips delimiters included in the selection", () => {
    expect(show(toggleWrap("plain **word**", 6, 14, "**"))).toBe("plain [word]");
  });

  it("strips delimiters sitting just outside the selection", () => {
    expect(show(toggleWrap("plain **word**", 8, 12, "**"))).toBe("plain [word]");
  });

  it("round-trips", () => {
    const on = toggleWrap("a word b", 2, 6, "*");
    const off = toggleWrap(on.value, on.start, on.end, "*");
    expect(off.value).toBe("a word b");
  });
});

describe("toggleLinePrefix", () => {
  it("adds the prefix to a single line", () => {
    expect(toggleLinePrefix("Context", 0, 0, "## ").value).toBe("## Context");
  });

  it("removes the prefix when every line already has it", () => {
    expect(toggleLinePrefix("> one\n> two", 0, 11, "> ").value).toBe("one\ntwo");
  });

  it("brings unprefixed lines up without stacking a second marker", () => {
    expect(toggleLinePrefix("- one\ntwo", 0, 9, "- ").value).toBe("- one\n- two");
  });

  it("swaps a competing prefix from the same family", () => {
    expect(toggleLinePrefix("### Deep", 0, 0, "## ", /^#{1,6}\s+/).value).toBe("## Deep");
  });

  it("leaves blank lines alone", () => {
    expect(toggleLinePrefix("one\n\ntwo", 0, 8, "> ").value).toBe("> one\n\n> two");
  });

  it("preserves indentation", () => {
    expect(toggleLinePrefix("  nested", 0, 0, "- ").value).toBe("  - nested");
  });

  it("expands a caret in mid-line to the whole line", () => {
    expect(toggleLinePrefix("Some text", 4, 4, "> ").value).toBe("> Some text");
  });
});

describe("setHeading", () => {
  it("applies the requested level", () => {
    expect(setHeading("Context", 0, 0, 2).value).toBe("## Context");
  });

  it("replaces an existing level rather than stacking", () => {
    expect(setHeading("#### Deep", 0, 0, 2).value).toBe("## Deep");
  });

  it("strips the marker at level 0", () => {
    expect(setHeading("### Deep", 0, 0, 0).value).toBe("Deep");
  });

  it("is idempotent for the level already applied", () => {
    expect(setHeading("## Same", 0, 0, 2).value).toBe("## Same");
  });

  it("applies across every selected line and skips blanks", () => {
    expect(setHeading("one\n\ntwo", 0, 8, 1).value).toBe("# one\n\n# two");
  });

  it("preserves indentation", () => {
    expect(setHeading("  nested", 0, 0, 3).value).toBe("  ### nested");
  });
});

describe("toggleOrderedList", () => {
  it("numbers each line in order", () => {
    expect(toggleOrderedList("one\ntwo\nthree", 0, 13).value).toBe("1. one\n2. two\n3. three");
  });

  it("strips numbering when every line is numbered", () => {
    expect(toggleOrderedList("1. one\n2. two", 0, 13).value).toBe("one\ntwo");
  });

  it("converts bullets rather than stacking markers", () => {
    expect(toggleOrderedList("- one\n- two", 0, 11).value).toBe("1. one\n2. two");
  });
});

describe("toggleFence", () => {
  it("wraps the selected lines", () => {
    expect(toggleFence("a\nb", 0, 3).value).toBe("```\na\nb\n```");
  });

  it("writes the language into the info string", () => {
    expect(toggleFence("a", 0, 1, "ts").value).toBe("```ts\na\n```");
  });

  it("unwraps an existing fence", () => {
    expect(toggleFence("```ts\na\nb\n```", 0, 15).value).toBe("a\nb");
  });

  it("round-trips", () => {
    const on = toggleFence("a\nb", 0, 3, "ts");
    expect(toggleFence(on.value, on.start, on.end).value).toBe("a\nb");
  });

  it("keeps inner content untouched, including blank lines", () => {
    expect(toggleFence("a\n\nb", 0, 4).value).toBe("```\na\n\nb\n```");
  });
});

describe("insertBlock", () => {
  it("places the block on its own line after the selection", () => {
    expect(insertBlock("para", 0, 4, "---").value).toBe("para\n\n---\n");
  });
});

describe("insertLink", () => {
  it("wraps the selection and selects the href", () => {
    expect(show(insertLink("see docs here", 4, 8, "https://x.dev"))).toBe(
      "see [docs]([https://x.dev]) here",
    );
  });
});
