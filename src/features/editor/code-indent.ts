/**
 * Auto-indent for code blocks.
 *
 * Pure on purpose: given a code block's text and the selection offsets within
 * it, work out what pressing Enter should produce. The editor layer only has
 * to apply the result.
 */

/** Two spaces, matching the Markdown extension's list/code indentation. */
export const INDENT_UNIT = "  ";

/** Openers that start a nested block, mapped to the closer that ends it. */
const BLOCK_PAIRS: Readonly<Record<string, string>> = {
  "{": "}",
  "[": "]",
  "(": ")",
};

export type IndentResult = { text: string; caret: number };

/**
 * Insert a newline that keeps the current line's indentation, adding one level
 * when the line opens a block. Python's `:` counts alongside the bracket
 * openers, so `def f():` indents its body.
 *
 * When the matching closer sits immediately after the caret (`{|}`), the block
 * is opened out over three lines with the closer returned to the original
 * indent.
 */
export function autoIndent(
  text: string,
  start: number,
  end: number = start,
  unit: string = INDENT_UNIT,
): IndentResult {
  const before = text.slice(0, start);
  const after = text.slice(end);

  const lineStart = before.lastIndexOf("\n") + 1;
  const line = before.slice(lineStart);
  const indent = line.slice(0, line.length - line.trimStart().length);

  const trimmed = line.trimEnd();
  const lastChar = trimmed.slice(-1);
  const opensBlock = lastChar === ":" || Object.hasOwn(BLOCK_PAIRS, lastChar);
  const inner = opensBlock ? indent + unit : indent;

  const closer = BLOCK_PAIRS[lastChar];
  if (closer !== undefined && after.startsWith(closer)) {
    const insertion = `\n${inner}\n${indent}`;
    return {
      text: before + insertion + after,
      // Caret lands on the blank middle line, not before the closer.
      caret: start + 1 + inner.length,
    };
  }

  const insertion = `\n${inner}`;
  return { text: before + insertion + after, caret: start + insertion.length };
}
