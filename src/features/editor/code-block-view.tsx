"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextSelection } from "@tiptap/pm/state";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { INDENT_UNIT, autoIndent } from "@/features/editor/code-indent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Languages offered on a fence. The value lands in the node's `language`
 * attribute and in the Markdown info string. It is metadata that travels with
 * the document — nothing highlights the block's contents yet.
 */
export const CODE_LANGUAGES: ReadonlyArray<readonly [string, string]> = [
  ["", "Plain text"],
  ["ts", "TypeScript"],
  ["tsx", "TSX"],
  ["js", "JavaScript"],
  ["jsx", "JSX"],
  ["json", "JSON"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["sql", "SQL"],
  ["bash", "Shell"],
  ["python", "Python"],
  ["rust", "Rust"],
  ["go", "Go"],
  ["yaml", "YAML"],
  ["markdown", "Markdown"],
];

/**
 * Grammars are registered individually rather than pulling in lowlight's
 * `common` bundle, so the client only ships the languages the picker offers.
 * `xml` backs HTML, and `typescript`/`javascript` back the JSX variants.
 */
const lowlight = createLowlight();
lowlight.register({ bash, css, go, json, markdown, python, rust, sql, typescript, javascript, xml, yaml });
lowlight.registerAlias({
  typescript: ["ts", "tsx"],
  javascript: ["js", "jsx"],
  xml: ["html"],
  bash: ["sh", "shell"],
  markdown: ["md"],
});

function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = (node.attrs.language as string | null) ?? "";
  const label = CODE_LANGUAGES.find(([value]) => value === language)?.[1] ?? language;

  return (
    <NodeViewWrapper className="group/codeblock relative">
      {/*
        contentEditable={false} keeps ProseMirror from treating the control as
        document content — without it the caret can land inside the button.
      */}
      <div
        contentEditable={false}
        className="absolute top-2 right-2 z-10 opacity-0 transition-opacity duration-150 group-hover/codeblock:opacity-100 focus-within:opacity-100"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={!editor.isEditable}
                aria-label="Code language"
                title={`Code language: ${label}`}
                className="h-6 w-auto min-w-6 rounded-md bg-code-background px-1.5 font-mono text-[11px] text-editor-muted-foreground hover:bg-secondary hover:text-foreground"
              />
            }
          >
            {language || "txt"}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-72 w-40 overflow-y-auto"
          >
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(value) =>
                updateAttributes({ language: String(value) || null })
              }
            >
              {CODE_LANGUAGES.map(([value, name]) => (
                <DropdownMenuRadioItem key={value || "plain"} value={value}>
                  {name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

/**
 * CodeBlock with the language picker rendered into the block's top-right
 * corner, so the control sits on the thing it configures rather than in the
 * document toolbar.
 */
export const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },

  addKeyboardShortcuts() {
    const parent = this.parent?.() ?? {};

    return {
      ...parent,
      Enter: (props) => {
        // The base handler exits the block on a triple Enter; let it win when
        // it applies, and otherwise carry the indentation.
        if (parent.Enter?.(props)) return true;

        const { state } = this.editor;
        const { $from, $to, from, to } = state.selection;
        if ($from.parent.type !== this.type || !$from.sameParent($to)) {
          return false;
        }

        const contentStart = $from.start();
        const text = $from.parent.textContent;
        const result = autoIndent(
          text,
          from - contentStart,
          to - contentStart,
          INDENT_UNIT,
        );

        return this.editor.commands.command(({ tr }) => {
          tr.insertText(result.text, contentStart, contentStart + text.length);
          tr.setSelection(
            TextSelection.create(tr.doc, contentStart + result.caret),
          );
          return true;
        });
      },
    };
  },
}).configure({
  lowlight,
  // Off by default in the extension, which is why Tab used to move focus out.
  enableTabIndentation: true,
  tabSize: INDENT_UNIT.length,
});
