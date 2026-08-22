/**
 * Text transforms for the Markdown source view.
 *
 * All pure: given the current text and selection, return the next text and
 * selection. The component layer only has to apply the result, which keeps the
 * behaviour unit-testable and free of DOM assumptions.
 */

export type Edit = { value: string; start: number; end: number };

/** Characters that wrap a selection instead of replacing it when typed. */
export const SURROUND_PAIRS: Readonly<Record<string, string>> = {
  "*": "*",
  _: "_",
  "`": "`",
  "~": "~",
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
};

/**
 * Wrap the selection in `open`/`close`, keeping the original text selected so
 * repeated presses nest — typing `*` twice over "word" yields `**word**`.
 */
export function surround(
  value: string,
  start: number,
  end: number,
  open: string,
  close: string = open,
): Edit {
  const selected = value.slice(start, end);
  return {
    value: value.slice(0, start) + open + selected + close + value.slice(end),
    start: start + open.length,
    end: end + open.length,
  };
}

/**
 * Toggle a wrapper around the selection: adds it, or strips it when the
 * selection is already wrapped (either inside or including the delimiters).
 */
export function toggleWrap(
  value: string,
  start: number,
  end: number,
  open: string,
  close: string = open,
): Edit {
  const selected = value.slice(start, end);

  // Selection includes the delimiters: "**word**" → "word".
  if (
    selected.length >= open.length + close.length &&
    selected.startsWith(open) &&
    selected.endsWith(close)
  ) {
    const inner = selected.slice(open.length, selected.length - close.length);
    return {
      value: value.slice(0, start) + inner + value.slice(end),
      start,
      end: start + inner.length,
    };
  }

  // Delimiters sit just outside the selection: "**|word|**" → "word".
  const before = value.slice(Math.max(0, start - open.length), start);
  const after = value.slice(end, end + close.length);
  if (before === open && after === close) {
    return {
      value:
        value.slice(0, start - open.length) + selected + value.slice(end + close.length),
      start: start - open.length,
      end: end - open.length,
    };
  }

  return surround(value, start, end, open, close);
}

/** Expands a selection to cover whole lines. */
function lineRange(value: string, start: number, end: number) {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const to = nextBreak === -1 ? value.length : nextBreak;
  return { from, to };
}

/**
 * Add `prefix` to every non-empty line in the selection, or strip it when all
 * of them already have it. `replaces` matches a competing prefix from the same
 * family (another heading level, another list marker) so the two swap cleanly
 * instead of stacking.
 */
export function toggleLinePrefix(
  value: string,
  start: number,
  end: number,
  prefix: string,
  replaces?: RegExp,
): Edit {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const meaningful = lines.filter((line) => line.trim() !== "");
  const target = meaningful.length > 0 ? meaningful : lines;

  const allPrefixed = target.every((line) => line.trimStart().startsWith(prefix));

  const next = lines.map((line) => {
    if (meaningful.length > 0 && line.trim() === "") return line;
    const indent = line.slice(0, line.length - line.trimStart().length);
    let body = line.trimStart();

    if (allPrefixed) return indent + body.slice(prefix.length);
    // A mixed selection converges on "all prefixed" rather than stacking a
    // second marker onto the lines that already carry one.
    if (body.startsWith(prefix)) return line;
    if (replaces) body = body.replace(replaces, "");
    return indent + prefix + body;
  });

  const replacement = next.join("\n");
  return {
    value: value.slice(0, from) + replacement + value.slice(to),
    start: from,
    end: from + replacement.length,
  };
}

const HEADING_MARKER = /^#{1,6}\s+/;

/**
 * Sets every selected line to `level` (1–6), or strips heading markers when
 * level is 0. Unlike toggleLinePrefix this does not toggle — the caller is a
 * radio menu, so choosing the level that is already applied is a no-op.
 */
export function setHeading(
  value: string,
  start: number,
  end: number,
  level: number,
): Edit {
  const { from, to } = lineRange(value, start, end);
  const prefix = level > 0 ? `${"#".repeat(level)} ` : "";

  const replacement = value
    .slice(from, to)
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return line;
      const indent = line.slice(0, line.length - line.trimStart().length);
      return indent + prefix + line.trimStart().replace(HEADING_MARKER, "");
    })
    .join("\n");

  return {
    value: value.slice(0, from) + replacement + value.slice(to),
    start: from,
    end: from + replacement.length,
  };
}

const ORDERED_MARKER = /^\d+[.)]\s+/;

/** Numbers each selected line 1., 2., 3.… or strips the numbering. */
export function toggleOrderedList(value: string, start: number, end: number): Edit {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const meaningful = lines.filter((line) => line.trim() !== "");
  const target = meaningful.length > 0 ? meaningful : lines;
  const allNumbered = target.every((line) => ORDERED_MARKER.test(line.trimStart()));

  let counter = 0;
  const next = lines.map((line) => {
    if (meaningful.length > 0 && line.trim() === "") return line;
    const indent = line.slice(0, line.length - line.trimStart().length);
    const body = line.trimStart();
    if (allNumbered) return indent + body.replace(ORDERED_MARKER, "");
    counter += 1;
    return `${indent}${counter}. ${body.replace(/^(?:[-*+]|\d+[.)])\s+/, "")}`;
  });

  const replacement = next.join("\n");
  return {
    value: value.slice(0, from) + replacement + value.slice(to),
    start: from,
    end: from + replacement.length,
  };
}

const FENCE = /^\s*(?:```|~~~)/;

/**
 * Wraps the selected lines in a fenced code block, or unwraps them when they
 * already are one. `language` becomes the fence's info string.
 */
export function toggleFence(
  value: string,
  start: number,
  end: number,
  language = "",
): Edit {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split("\n");

  const fenced =
    lines.length >= 2 && FENCE.test(lines[0]) && FENCE.test(lines[lines.length - 1]);

  const replacement = fenced
    ? lines.slice(1, -1).join("\n")
    : [`\`\`\`${language}`, ...lines, "```"].join("\n");

  return {
    value: value.slice(0, from) + replacement + value.slice(to),
    start: from,
    end: from + replacement.length,
  };
}

/** Inserts `block` on its own line after the selection, e.g. a divider. */
export function insertBlock(value: string, start: number, end: number, block: string): Edit {
  const { to } = lineRange(value, start, end);
  const insertion = `\n\n${block}\n`;
  const caret = to + insertion.length;
  return {
    value: value.slice(0, to) + insertion + value.slice(to),
    start: caret,
    end: caret,
  };
}

/** Wraps the selection as a link, leaving the caret inside the empty target. */
export function insertLink(value: string, start: number, end: number, href: string): Edit {
  const label = value.slice(start, end);
  const snippet = `[${label}](${href})`;
  return {
    value: value.slice(0, start) + snippet + value.slice(end),
    start: start + label.length + 3,
    end: start + label.length + 3 + href.length,
  };
}
