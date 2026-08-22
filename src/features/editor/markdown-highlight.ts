/**
 * Line-oriented Markdown tokenizer for the source view.
 *
 * This is a *highlighter*, not a parser — it classifies spans well enough to
 * colour them and never needs to be spec-complete. Deliberately dependency
 * free: the source view only ever holds Markdown, so a full grammar engine
 * would be far more machinery than the job needs.
 */

export type TokenKind =
  | "plain"
  | "marker"
  | "heading"
  | "strong"
  | "emphasis"
  | "strike"
  | "code"
  | "link"
  | "url";

export type Token = { text: string; kind: TokenKind };

/** Ordered alternation — earlier groups win, so code spans beat emphasis. */
const INLINE =
  /(`[^`\n]*`)|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\n]+\*|_[^_\n]+_)|(~~[^~\n]+~~)|(\[[^\]\n]*\]\([^)\n]*\))|(<https?:\/\/[^>\s]+>|\bhttps?:\/\/[^\s)]+)/g;

function inlineTokens(text: string): Token[] {
  if (!text) return [];
  const tokens: Token[] = [];
  let last = 0;
  INLINE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ text: text.slice(last, match.index), kind: "plain" });
    }
    const value = match[0];
    if (match[1]) tokens.push({ text: value, kind: "code" });
    else if (match[2]) tokens.push({ text: value, kind: "strong" });
    else if (match[3]) tokens.push({ text: value, kind: "emphasis" });
    else if (match[4]) tokens.push({ text: value, kind: "strike" });
    else if (match[5]) {
      // `[label](href)` — colour the label and the target differently.
      const split = value.indexOf("](");
      tokens.push({ text: value.slice(0, split + 1), kind: "link" });
      tokens.push({ text: value.slice(split + 1), kind: "url" });
    } else tokens.push({ text: value, kind: "url" });
    last = match.index + value.length;
  }

  if (last < text.length) tokens.push({ text: text.slice(last), kind: "plain" });
  return tokens;
}

/**
 * Returns one token list per source line. Empty lines yield an empty list so
 * the caller can render a placeholder that still occupies a row.
 */
export function highlightMarkdown(source: string): Token[][] {
  const lines: Token[][] = [];
  let inFence = false;

  for (const line of source.split("\n")) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      lines.push([{ text: line, kind: "code" }]);
      continue;
    }
    if (inFence) {
      lines.push([{ text: line, kind: "code" }]);
      continue;
    }
    if (line.trim() === "") {
      lines.push([]);
      continue;
    }

    const heading = /^(\s*#{1,6}\s+)(.*)$/.exec(line);
    if (heading) {
      lines.push([
        { text: heading[1], kind: "marker" },
        { text: heading[2], kind: "heading" },
      ]);
      continue;
    }

    // Thematic break: three or more of the same marker, spaces allowed.
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      lines.push([{ text: line, kind: "marker" }]);
      continue;
    }

    const quote = /^(\s*>+\s?)(.*)$/.exec(line);
    if (quote) {
      lines.push([{ text: quote[1], kind: "marker" }, ...inlineTokens(quote[2])]);
      continue;
    }

    // Bullet or ordered item, optionally a task checkbox.
    const item = /^(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/.exec(line);
    if (item) {
      lines.push([{ text: item[1], kind: "marker" }, ...inlineTokens(item[2])]);
      continue;
    }

    lines.push(inlineTokens(line));
  }

  return lines;
}

/**
 * Block- and inline-level constructs that mark a plain-text string as Markdown.
 * Used to decide whether pasted text should be parsed rather than inserted
 * literally, so the bar is "unambiguously Markdown" — prose that merely
 * contains an asterisk or a hyphen must not qualify.
 */
const MARKDOWN_SIGNALS: RegExp[] = [
  /^\s{0,3}#{1,6}\s+\S/m, // heading
  /^\s{0,3}(?:```|~~~)/m, // fenced code
  /^\s{0,3}>\s+\S/m, // blockquote
  /^\s{0,3}(?:[-*+]|\d+[.)])\s+\S/m, // list item
  /^\s{0,3}(?:\|.*\|)\s*$/m, // table row
  /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/m, // thematic break
  /!?\[[^\]\n]*\]\([^)\n]*\)/, // link or image
  /(\*\*|__)\S[^\n]*\1/, // strong
  /`[^`\n]+`/, // inline code
];

/**
 * True when the text carries at least one unmistakable Markdown construct.
 * Deliberately conservative: a false positive rewrites text the author meant
 * literally, which is far more annoying than a missed conversion.
 */
export function looksLikeMarkdown(text: string): boolean {
  if (text.trim() === "") return false;
  return MARKDOWN_SIGNALS.some((signal) => signal.test(text));
}
