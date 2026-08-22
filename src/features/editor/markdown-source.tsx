"use client";

import { useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";
import {
  highlightMarkdown,
  type TokenKind,
} from "@/features/editor/markdown-highlight";
import {
  SURROUND_PAIRS,
  surround,
  type Edit,
} from "@/features/editor/markdown-commands";

/**
 * Metrics shared by the highlight layer and the textarea stacked on top of it.
 * The two must wrap at exactly the same points, so every property that affects
 * line breaking lives here and is applied to both.
 */
const LAYER =
  "m-0 border-0 p-0 font-mono text-sm leading-7 tracking-normal break-words whitespace-pre-wrap";

/**
 * Colour only — no weight, style or size changes. A bold or italic run would
 * measure differently from the plain text in the textarea underneath and the
 * two layers would drift apart mid-paragraph.
 */
const KIND_CLASS: Record<TokenKind, string> = {
  plain: "text-editor-prose",
  marker: "text-syntax-marker",
  heading: "text-syntax-heading",
  strong: "text-syntax-heading",
  emphasis: "text-syntax-heading",
  strike: "text-syntax-marker",
  code: "text-syntax-code",
  link: "text-syntax-link",
  url: "text-syntax-link",
};

/** Lets the toolbar drive the textarea without owning its selection state. */
export type MarkdownSourceHandle = {
  apply: (transform: (value: string, start: number, end: number) => Edit) => void;
};

/**
 * Narrows a whole-document rewrite down to the span that actually changed, so
 * an edit costs one undo step covering just that span rather than the entire
 * document.
 */
function minimalReplace(before: string, after: string) {
  let from = 0;
  const shortest = Math.min(before.length, after.length);
  while (from < shortest && before[from] === after[from]) from += 1;

  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > from &&
    endAfter > from &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }

  return { from, to: endBefore, text: after.slice(from, endAfter) };
}

export function MarkdownSource({
  value,
  onChange,
  onBlur,
  readOnly,
  showLineNumbers,
  handleRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  readOnly?: boolean;
  showLineNumbers: boolean;
  handleRef?: React.RefObject<MarkdownSourceHandle | null>;
}) {
  const lines = useMemo(() => highlightMarkdown(value), [value]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<[number, number] | null>(null);

  // Restore the selection once React has committed the new value.
  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    if (!pending || !textareaRef.current) return;
    pendingSelection.current = null;
    textareaRef.current.setSelectionRange(pending[0], pending[1]);
  }, [value]);

  const applyEdit = useCallback(
    (edit: Edit) => {
      const el = textareaRef.current;
      if (!el) return;

      const { from, to, text } = minimalReplace(el.value, edit.value);
      el.focus();
      el.setSelectionRange(from, to);

      // execCommand is the only way to mutate a textarea while keeping the
      // browser's native undo stack intact; fall back to a plain state write.
      const applied =
        text === ""
          ? document.execCommand("delete")
          : document.execCommand("insertText", false, text);
      if (!applied) onChange(edit.value);

      pendingSelection.current = [edit.start, edit.end];
    },
    [onChange],
  );

  useImperativeHandle(
    handleRef,
    () => ({
      apply: (transform) => {
        const el = textareaRef.current;
        if (!el || readOnly) return;
        applyEdit(transform(el.value, el.selectionStart, el.selectionEnd));
      },
    }),
    [applyEdit, readOnly],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (readOnly || event.metaKey || event.ctrlKey) return;
    const close = SURROUND_PAIRS[event.key];
    if (close === undefined) return;

    const el = event.currentTarget;
    // With no selection there is nothing to wrap — let the character type
    // normally rather than auto-closing the pair.
    if (el.selectionStart === el.selectionEnd) return;

    event.preventDefault();
    applyEdit(
      surround(el.value, el.selectionStart, el.selectionEnd, event.key, close),
    );
  }

  // Gutter widens with the line count so the numbers stay right-aligned.
  const digits = Math.max(2, String(lines.length).length);
  const gutter = showLineNumbers ? `calc(${digits}ch + 1.75rem)` : undefined;
  const padding = showLineNumbers ? { paddingLeft: gutter } : undefined;

  return (
    <div className="relative min-h-96">
      <pre aria-hidden="true" className={cn(LAYER, "select-none")} style={padding}>
        {lines.map((tokens, index) => (
          <span key={index} className="relative block">
            {showLineNumbers ? (
              <span className="absolute right-full mr-4 text-syntax-marker/60 tabular-nums">
                {index + 1}
              </span>
            ) : null}
            {tokens.length > 0
              ? tokens.map((token, position) => (
                  <span key={position} className={KIND_CLASS[token.kind]}>
                    {token.text}
                  </span>
                ))
              : // Zero-width space keeps an empty line occupying a full row.
                "​"}
          </span>
        ))}
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        readOnly={readOnly}
        aria-label="Document markdown source"
        spellCheck={false}
        style={padding}
        className={cn(
          LAYER,
          "markdown-source-input absolute inset-0 resize-none overflow-hidden bg-transparent text-transparent caret-editor-foreground outline-none",
        )}
      />
    </div>
  );
}
