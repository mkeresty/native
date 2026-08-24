"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import {
  BoldIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  FileCodeIcon,
  HashIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  HeadingIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  QuoteIcon,
  SquareCodeIcon,
  StrikethroughIcon,
  MinusIcon,
  Share2Icon,
  DownloadIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { saveDocumentAction } from "@/features/documents/actions";
import { useFocusMode } from "@/features/workspace/ui-state";
import {
  presenceColor,
  presenceInitials,
} from "@/features/collaboration/presence";
import {
  useCollaboration,
  type CollabPeer,
  type CollabStatus,
} from "@/features/collaboration/use-collaboration";
import {
  MarkdownSource,
  type MarkdownSourceHandle,
} from "@/features/editor/markdown-source";
import {
  insertBlock,
  insertLink,
  setHeading,
  toggleFence,
  toggleLinePrefix,
  toggleOrderedList,
  toggleWrap,
} from "@/features/editor/markdown-commands";
import { looksLikeMarkdown } from "@/features/editor/markdown-highlight";
import { CodeBlockWithLanguage } from "@/features/editor/code-block-view";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  formatRelativeTime,
  readingTimeMinutes,
} from "@/lib/utils/time";

const SAVE_DEBOUNCE_MS = 900;

/**
 * Turns a multi-block selection into ONE code block holding the joined lines.
 * Tiptap's toggleCodeBlock uses setBlockType, which would convert each
 * paragraph into its own separate fence instead.
 */
function collapseIntoCodeBlock(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, "\n");
  editor
    .chain()
    .focus()
    .deleteSelection()
    .insertContent({
      type: "codeBlock",
      content: text ? [{ type: "text", text }] : [],
    })
    .run();
}

/** A new list marker replaces a competing one rather than stacking onto it. */
const LIST_PREFIX = /^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;

type FormatCommand =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "codeBlock"
  | "bullet"
  | "ordered"
  | "task"
  | "quote"
  | "divider";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

export function DocumentEditor({
  document: initialDocument,
  user,
}: {
  document: {
    id: string;
    title: string;
    contentMd: string;
    folderName: string | null;
    authorName: string;
    updatedAt: Date;
  };
  user: { id: string; name: string };
}) {
  const { focused } = useFocusMode();
  const collab = useCollaboration({
    documentId: initialDocument.id,
    user,
  });
  // Solo mode is ready immediately; collaboration waits for the first Yjs
  // sync so the editor never binds to a half-loaded document.
  const collabReady = !collab.enabled || collab.ready;
  const [title, setTitle] = useState(initialDocument.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"write" | "read">("write");
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(initialDocument.contentMd);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [copied, setCopied] = useState(false);
  const sourceRef = useRef<MarkdownSourceHandle | null>(null);
  // handlePaste is defined while the editor is being created, so it reaches the
  // instance through a ref rather than the (not yet assigned) local.
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  // 0 = top of document, 1 = title fully compacted.
  const [scrollProgress, setScrollProgress] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // onUpdate closes over the editor config, so it reads the mode from a ref.
  const isSourceModeRef = useRef(false);
  useEffect(() => {
    isSourceModeRef.current = isSourceMode;
  }, [isSourceMode]);

  const latestRef = useRef({
    documentId: initialDocument.id,
    title: initialDocument.title,
    contentMd: initialDocument.contentMd,
    dirty: false,
  });

  // In collaboration mode the editor is recreated once the first sync lands:
  // content then comes from the shared Yjs fragment, never from the stale
  // server markdown snapshot. The pre-sync instance is never displayed.
  const collaborative = collab.enabled && collabReady && collab.ydoc !== null;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Replaced below with a variant that renders its own language picker.
          codeBlock: false,
          heading: { levels: [1, 2, 3, 4] },
          link: {
            openOnClick: false,
            autolink: true,
            defaultProtocol: "https",
            HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
          },
          // Yjs owns undo/redo while collaborating; local history would
          // desync the CRDT.
          ...(collaborative ? { undoRedo: false as const } : {}),
        }),
        CodeBlockWithLanguage,
        TaskList,
        TaskItem.configure({ nested: true }),
        Markdown.configure({
          indentation: { style: "space", size: 2 },
        }),
        ...(collaborative && collab.ydoc && collab.provider
          ? [
              Collaboration.configure({ document: collab.ydoc }),
              CollaborationCaret.configure({
                provider: collab.provider,
                user: {
                  id: user.id,
                  name: user.name,
                  color: presenceColor(user.id),
                },
              }),
            ]
          : []),
      ],
      // In collaborative mode the Yjs fragment is the initial content.
      ...(collaborative
        ? {}
        : { content: initialDocument.contentMd, contentType: "markdown" as const }),
      immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-prose min-h-full outline-none",
        "aria-label": "Document content",
      },
      /**
       * Plain-text Markdown pasted from an editor or terminal arrives with no
       * HTML flavour, so ProseMirror drops it in verbatim and only the paste
       * rules (bold, autolink) fire — a half-converted mess. Parse it instead.
       */
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        // A rich source supplied real HTML; let ProseMirror handle it.
        if (clipboard.types.includes("text/html")) return false;

        const text = clipboard.getData("text/plain");
        if (!text || !looksLikeMarkdown(text)) return false;

        // Inside a code block the markup is the content.
        const { $from } = view.state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name === "codeBlock") return false;
        }

        const active = editorRef.current;
        if (!active) return false;

        event.preventDefault();
        active.commands.insertContent(text, { contentType: "markdown" });
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      // While the source view is open the textarea owns the document. The
      // editor still holds whatever it had on entering source mode, so letting
      // its updates through here would overwrite the draft with stale content.
      if (isSourceModeRef.current) return;
      const md = editor.getMarkdown();
      // Transactions fire for selection-only changes and programmatic updates;
      // only real content differences count as edits.
      if (md === latestRef.current.contentMd) return;
      latestRef.current.contentMd = md;
      latestRef.current.dirty = true;
      setStatus("dirty");
    },
    // Recreate once (solo → collaborative) so the editor binds the synced
    // Yjs fragment instead of the server markdown snapshot.
  }, [collabReady]);

  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  /**
   * First-run seeding. A brand-new document has no Yjs state anywhere, so the
   * first client to arrive promotes the stored Markdown into the fragment.
   * A short delay plus a CRDT flag (`meta.seeded`) keeps two clients that open
   * the doc simultaneously from seeding it twice.
   */
  const [seedResolved, setSeedResolved] = useState(!collab.enabled);
  useEffect(() => {
    if (!collab.enabled || !collab.ydoc || !editor || !collab.ready) return;
    const meta = collab.ydoc.getMap("meta");
    const fragment = collab.ydoc.getXmlFragment("default");
    const timer = setTimeout(() => {
      if (!meta.get("seeded")) {
        if (fragment.length === 0 && initialDocument.contentMd.trim() !== "") {
          editor.commands.setContent(initialDocument.contentMd, {
            contentType: "markdown",
          });
        }
        meta.set("seeded", true);
      }
      setSeedResolved(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [collab.enabled, collab.ready, collab.ydoc, editor, initialDocument.contentMd]);

  /**
   * Self-heal for canonical Markdown. The party snapshots only the binary Yjs
   * state, so after an abrupt disconnect `content_md` can trail the fragment;
   * the first client to sync writes the converged Markdown back.
   */
  useEffect(() => {
    if (!collab.enabled || !seedResolved || !editor || !collab.ready) return;
    const md = editor.getMarkdown();
    if (md === latestRef.current.contentMd) return;
    latestRef.current.contentMd = md;
    latestRef.current.dirty = true;
    setStatus("dirty");
  }, [collab.enabled, collab.ready, seedResolved, editor]);

  const flushSave = useCallback(async () => {
    if (!latestRef.current.dirty) return;
    // Copy the fields by value. Holding onto latestRef.current would alias the
    // live object, so the post-save comparison below would compare it with
    // itself and always report "nothing changed".
    const snapshot = {
      documentId: latestRef.current.documentId,
      title: latestRef.current.title,
      contentMd: latestRef.current.contentMd,
    };
    setStatus("saving");
    try {
      const result = await saveDocumentAction(snapshot);
      if (!result.ok) throw new Error(result.error);
      if (
        latestRef.current.title === snapshot.title &&
        latestRef.current.contentMd === snapshot.contentMd
      ) {
        latestRef.current.dirty = false;
        setStatus("saved");
        setSavedAt(new Date());
      } else {
        // The document moved on while the request was in flight; re-arm the
        // debounce so the newer content still reaches the server.
        setStatus("dirty");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (status !== "dirty") return;
    const timer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [status, flushSave]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (latestRef.current.dirty) event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Title compacts as the document scrolls (0 → 1 over ~140px).
  const scrollRaf = useRef(0);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      setScrollProgress(Math.min(1, Math.max(0, el.scrollTop / 140)));
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(scrollRaf.current), []);

  const lastActivity = savedAt ?? initialDocument.updatedAt;
  const readingTime = readingTimeMinutes(markdownDraft);

  // The toolbar is "stuck" once its sentinel scrolls out of view.
  const [isToolbarStuck, setIsToolbarStuck] = useState(false);
  const toolbarSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = toolbarSentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsToolbarStuck(!entry.isIntersecting),
      { root, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [editor, viewMode, isSourceMode]);

  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(latestRef.current.contentMd);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to the clipboard.");
    }
  }, []);

  /**
   * One toolbar, two targets. In source mode the commands rewrite raw Markdown
   * in the textarea; otherwise they run through the rich-text editor.
   */
  const runFormatCommand = useCallback(
    (command: FormatCommand) => {
      if (isSourceMode) {
        const source = sourceRef.current;
        if (!source) return;
        switch (command) {
          case "bold":
            return source.apply((v, s, e) => toggleWrap(v, s, e, "**"));
          case "italic":
            return source.apply((v, s, e) => toggleWrap(v, s, e, "*"));
          case "strike":
            return source.apply((v, s, e) => toggleWrap(v, s, e, "~~"));
          case "code":
            // A run spanning lines cannot be an inline span, so it becomes a
            // fence — matching what the rich editor does with the same click.
            return source.apply((v, s, e) =>
              v.slice(s, e).includes("\n")
                ? toggleFence(v, s, e)
                : toggleWrap(v, s, e, "`"),
            );
          case "codeBlock":
            return source.apply((v, s, e) => toggleFence(v, s, e));
          case "bullet":
            return source.apply((v, s, e) =>
              toggleLinePrefix(v, s, e, "- ", LIST_PREFIX),
            );
          case "ordered":
            return source.apply(toggleOrderedList);
          case "task":
            return source.apply((v, s, e) =>
              toggleLinePrefix(v, s, e, "- [ ] ", LIST_PREFIX),
            );
          case "quote":
            return source.apply((v, s, e) => toggleLinePrefix(v, s, e, "> "));
          case "divider":
            return source.apply((v, s, e) => insertBlock(v, s, e, "---"));
        }
      }

      if (!editor) return;
      const chain = editor.chain().focus();
      switch (command) {
        case "bold":
          return chain.toggleBold().run();
        case "italic":
          return chain.toggleItalic().run();
        case "strike":
          return chain.toggleStrike().run();
        case "code": {
          // The code mark cannot cross block boundaries, so a selection
          // spanning blocks becomes a code block. Count textblocks rather than
          // comparing parents: a select-all yields an AllSelection whose ends
          // both resolve to the doc node, which would look like one block.
          const { from, to } = editor.state.selection;
          let blocks = 0;
          editor.state.doc.nodesBetween(from, to, (node) => {
            if (node.isTextblock) blocks += 1;
          });
          if (editor.isActive("codeBlock")) return chain.toggleCodeBlock().run();
          if (blocks > 1) return collapseIntoCodeBlock(editor);
          return chain.toggleCode().run();
        }
        case "codeBlock": {
          if (editor.isActive("codeBlock")) return chain.toggleCodeBlock().run();
          const { from, to } = editor.state.selection;
          let count = 0;
          editor.state.doc.nodesBetween(from, to, (node) => {
            if (node.isTextblock) count += 1;
          });
          if (count > 1) return collapseIntoCodeBlock(editor);
          return chain.toggleCodeBlock().run();
        }
        case "bullet":
          return chain.toggleBulletList().run();
        case "ordered":
          return chain.toggleOrderedList().run();
        case "task":
          return chain.toggleTaskList().run();
        case "quote":
          return chain.toggleBlockquote().run();
        case "divider":
          return chain.setHorizontalRule().run();
      }
    },
    [editor, isSourceMode],
  );

  const applyHeading = useCallback(
    (level: number) => {
      if (isSourceMode) {
        sourceRef.current?.apply((v, s, e) => setHeading(v, s, e, level));
        return;
      }
      const chain = editor?.chain().focus();
      if (!chain) return;
      if (level === 0) chain.setParagraph().run();
      else chain.setHeading({ level: level as 1 | 2 | 3 | 4 }).run();
    },
    [editor, isSourceMode],
  );

  const applyLink = useCallback(
    (href: string) => {
      if (isSourceMode) {
        sourceRef.current?.apply((v, s, e) => insertLink(v, s, e, href));
        return;
      }
      const chain = editor?.chain().focus().extendMarkRange("link");
      if (!chain) return;
      if (href.trim() === "") chain.unsetLink().run();
      else chain.setLink({ href: href.trim() }).run();
    },
    [editor, isSourceMode],
  );

  const markDirtyTitle = useCallback((value: string) => {
    setTitle(value);
    latestRef.current.title = value;
    latestRef.current.dirty = true;
    setStatus("dirty");
  }, []);

  useEffect(() => {
    editor?.setEditable(viewMode === "write" && !isSourceMode);
  }, [editor, isSourceMode, viewMode]);

  function applyMarkdownSource() {
    if (!editor) return;
    editor.commands.setContent(markdownDraft, { contentType: "markdown" });
    const normalizedMarkdown = editor.getMarkdown();
    setMarkdownDraft(normalizedMarkdown);
    latestRef.current.contentMd = normalizedMarkdown;
  }

  function switchViewMode(mode: "write" | "read") {
    if (mode === viewMode) return;
    if (isSourceMode) {
      applyMarkdownSource();
      setIsSourceMode(false);
    }
    setViewMode(mode);
  }

  function toggleSourceMode() {
    if (isSourceMode) {
      applyMarkdownSource();
      setIsSourceMode(false);
      return;
    }
    setMarkdownDraft(latestRef.current.contentMd);
    setIsSourceMode(true);
  }

  function handleMarkdownChange(value: string) {
    setMarkdownDraft(value);
    if (value === latestRef.current.contentMd) return;
    latestRef.current.contentMd = value;
    latestRef.current.dirty = true;
    setStatus("dirty");
  }

  // ⌘/Ctrl+S flushes the pending save.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flushSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flushSave]);

  async function handleExport() {
    await flushSave();
    const blob = new Blob([latestRef.current.contentMd], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.trim() || "untitled"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // Collaboration only: hold chrome steady while the first Yjs sync lands.
  // All hooks have run above; the pre-sync editor instance is discarded.
  if (!collabReady) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-workspace">
        <div className="flex flex-1 items-center justify-center text-xs text-editor-muted-foreground">
          Connecting to the document…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-workspace">
      {/* Left padding reserves the gutter for the shell's sidebar toggle.
          Hidden entirely in focus mode — the document is the only chrome. */}
      {!focused ? (
      <header className="document-topbar flex h-[57px] shrink-0 items-center justify-between gap-[18px] border-b pr-5 pl-[55px] text-xs text-editor-muted-foreground sm:pr-7 sm:pl-[63px]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-32 leading-tight sm:max-w-44">
            {initialDocument.folderName ?? "Workspace"}
          </span>
          <span aria-hidden>/</span>
          <span className="truncate leading-tight">{title || "Untitled"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveStatusIndicator status={status} savedAt={savedAt} />
          {collab.enabled ? (
            <PresenceStack peers={collab.peers} status={collab.status} />
          ) : null}
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden border-editor-control-border bg-editor-control text-foreground hover:bg-secondary sm:inline-flex"
            aria-label="Export .md"
            title="Download as Markdown (.md)"
            onClick={() => void handleExport()}
          >
            <DownloadIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-[7px] border-editor-control-border bg-editor-control px-2.5 py-[7px] text-xs font-semibold text-foreground hover:bg-secondary sm:inline-flex"
          >
            <Share2Icon data-icon="inline-start" />
            Share
          </Button>
          <ToggleGroup
            value={[viewMode]}
            onValueChange={(values) =>
              switchViewMode((values[0] as "write" | "read") ?? "write")
            }
            aria-label="Editing view"
            spacing={2}
          >
            <ToggleGroupItem
              value="write"
              aria-label="Write mode"
              title="Write mode"
              className="rounded-md border-0 px-2 py-[7px] text-xs text-editor-muted-foreground aria-pressed:bg-accent aria-pressed:font-bold aria-pressed:text-accent-foreground"
            >
              Write
            </ToggleGroupItem>
            <ToggleGroupItem
              value="read"
              aria-label="Read mode"
              title="Read mode"
              className="rounded-md border-0 px-2 py-[7px] text-xs text-editor-muted-foreground aria-pressed:bg-accent aria-pressed:font-bold aria-pressed:text-accent-foreground"
            >
              Read
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-editor-background"
      >
        <div className="mx-auto w-full max-w-[760px] px-6 pt-9 pb-15 sm:px-10">
          {/* Eyebrow above the title; save state lives in the top bar. */}
          <div className="mb-[15px] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-editor-muted-foreground">
            <span>Updated {formatRelativeTime(lastActivity)}</span>
          </div>
          <input
            value={title}
            onChange={(event) => markDirtyTitle(event.target.value)}
            onBlur={() => void flushSave()}
            readOnly={viewMode === "read"}
            placeholder="Untitled"
            aria-label="Document title"
            style={{ fontSize: `${2.6875 - 0.95 * scrollProgress}rem` }}
            className="mb-3.5 w-full bg-transparent font-heading leading-[1.05] font-medium tracking-[-0.045em] text-editor-foreground outline-none transition-[font-size] duration-75 ease-out placeholder:text-muted-foreground/60"
          />
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b pb-6 text-xs text-muted-foreground">
            {initialDocument.folderName ? (
              <span className="rounded-full bg-muted px-2 py-1 font-semibold text-secondary-foreground">
                {initialDocument.folderName}
              </span>
            ) : null}
            <span>Owned by {initialDocument.authorName}</span>
            {readingTime ? (
              <>
                <span aria-hidden>·</span>
                <span>{readingTime} min read</span>
              </>
            ) : null}
          </div>
          {editor && viewMode === "write" ? (
            <>
              <div ref={toolbarSentinelRef} aria-hidden className="h-px" />
              <Toolbar
                editor={editor}
                isSourceMode={isSourceMode}
                onToggleSourceMode={toggleSourceMode}
                showLineNumbers={showLineNumbers}
                onToggleLineNumbers={() => setShowLineNumbers((on) => !on)}
                onCommand={runFormatCommand}
                onSetHeading={applyHeading}
                onApplyLink={applyLink}
                copied={copied}
                onCopyAll={() => void handleCopyAll()}
                isStuck={isToolbarStuck}
                className="sticky top-0 z-10 mb-[34px]"
              />
              {isSourceMode ? (
                <MarkdownSource
                  value={markdownDraft}
                  onChange={handleMarkdownChange}
                  onBlur={() => void flushSave()}
                  showLineNumbers={showLineNumbers}
                  handleRef={sourceRef}
                />
              ) : (
                <div className="max-w-[650px]">
                  <EditorContent editor={editor} />
                </div>
              )}
            </>
        ) : editor ? (
            <div className="max-w-[650px]">
              <EditorContent editor={editor} />
            </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading editor…
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

/** Live presence: peer avatars, plus a calm indicator when the room is down. */
function PresenceStack({
  peers,
  status,
}: {
  peers: CollabPeer[];
  status: CollabStatus;
}) {
  return (
    <div className="flex items-center gap-2">
      {peers.length > 0 ? (
        <AvatarGroup
          aria-label={
            peers.length === 1
              ? "You are the only one here"
              : `${peers.map((peer) => peer.name).join(", ")} are collaborating`
          }
        >
          {peers.slice(0, 4).map((peer) => (
            <Avatar
              key={peer.clientId}
              className="size-[25px] border-2 border-card"
              title={peer.isSelf ? `${peer.name} (you)` : peer.name}
            >
              <AvatarFallback
                style={{ backgroundColor: peer.color }}
                className="font-mono text-[9px] font-extrabold text-white"
              >
                {presenceInitials(peer.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {peers.length > 4 ? (
            <Avatar className="size-[25px] border-2 border-card">
              <AvatarFallback className="bg-muted font-mono text-[9px] font-extrabold text-muted-foreground">
                +{peers.length - 4}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </AvatarGroup>
      ) : null}
      {status === "offline" ? (
        <span
          className="inline-flex items-center gap-1.5 text-xs text-editor-muted-foreground"
          role="status"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/50" />
          Offline — edits sync when reconnected
        </span>
      ) : null}
    </div>
  );
}

function SaveStatusIndicator({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: Date | null;
}) {
  const label =
    status === "saving"
      ? "Saving…"
      : status === "error"
        ? "Save failed — retrying on next edit"
        : status === "dirty"
          ? "Unsaved changes"
          : savedAt
            ? `Saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : "Saved";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-editor-muted-foreground"
      role="status"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full transition-colors",
          status === "error"
            ? "bg-destructive"
            : status === "saved"
              ? "bg-status-online"
              : "bg-muted-foreground/50 animate-pulse",
        )}
      />
      {label}
    </span>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "size-[27px] min-w-[27px] rounded-md text-editor-foreground hover:bg-secondary [&_svg:not([class*='size-'])]:size-[15px]",
        active && "bg-secondary text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

function Toolbar({
  editor,
  isSourceMode,
  onToggleSourceMode,
  showLineNumbers,
  onToggleLineNumbers,
  onCommand,
  onSetHeading,
  onApplyLink,
  copied,
  onCopyAll,
  isStuck,
  className,
}: {
  editor: ReturnType<typeof useEditor>;
  isSourceMode: boolean;
  onToggleSourceMode: () => void;
  showLineNumbers: boolean;
  onToggleLineNumbers: () => void;
  onCommand: (command: FormatCommand) => void;
  onSetHeading: (level: number) => void;
  onApplyLink: (href: string) => void;
  copied: boolean;
  onCopyAll: () => void;
  isStuck?: boolean;
  className?: string;
}) {
  const state = useEditorState({
    editor,
    selector({ editor }) {
      if (!editor) return null;
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        strike: editor.isActive("strike"),
        code: editor.isActive("code"),
        codeBlock: editor.isActive("codeBlock"),
        headingLevel: ([1, 2, 3, 4] as const).find((level) =>
          editor.isActive("heading", { level }),
        ) ?? 0,
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        taskList: editor.isActive("taskList"),
        blockquote: editor.isActive("blockquote"),
        link: editor.isActive("link"),
      };
    },
  });
  if (!state) return null;

  return (
    <div
      data-toolbar=""
      className={cn(
        // Flat rule rather than a floating pill; the background only exists so
        // scrolled content does not show through while the bar is stuck.
        "flex items-center gap-1 border-b bg-editor-background py-[13px]",
        // Too many controls to fit a phone, so the row scrolls sideways rather
        // than wrapping or pushing the page wider. Both menus are portalled,
        // so the overflow container does not clip them.
        "no-scrollbar overflow-x-auto",
        isStuck && "shadow-[0_6px_12px_-10px_var(--toolbar-border)]",
        className,
      )}
    >
      <ToolbarButton
        label="Bold (⌘B)"
        active={!isSourceMode && state.bold}
        onClick={() => onCommand("bold")}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Italic (⌘I)"
        active={!isSourceMode && state.italic}
        onClick={() => onCommand("italic")}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough (⌘⇧S)"
        active={!isSourceMode && state.strike}
        onClick={() => onCommand("strike")}
      >
        <StrikethroughIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code (⌘E)"
        active={!isSourceMode && state.code}
        onClick={() => onCommand("code")}
      >
        <CodeIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={!isSourceMode && state.codeBlock}
        onClick={() => onCommand("codeBlock")}
      >
        <SquareCodeIcon />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-[5px] !h-[25px] shrink-0 !self-center" />

      <HeadingMenu
        level={isSourceMode ? 0 : state.headingLevel}
        showActive={!isSourceMode}
        onSelect={onSetHeading}
      />

      <Separator orientation="vertical" className="mx-[5px] !h-[25px] shrink-0 !self-center" />

      <ToolbarButton
        label="Bullet list (⌘⇧8)"
        active={!isSourceMode && state.bulletList}
        onClick={() => onCommand("bullet")}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list (⌘⇧7)"
        active={!isSourceMode && state.orderedList}
        onClick={() => onCommand("ordered")}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        active={!isSourceMode && state.taskList}
        onClick={() => onCommand("task")}
      >
        <ListTodoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={!isSourceMode && state.blockquote}
        onClick={() => onCommand("quote")}
      >
        <QuoteIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Divider"
        onClick={() => onCommand("divider")}
      >
        <MinusIcon />
      </ToolbarButton>

      <LinkPopover
        active={!isSourceMode && state.link}
        currentHref={isSourceMode ? "" : (editor?.getAttributes("link").href ?? "")}
        onApply={onApplyLink}
      />

      <Separator orientation="vertical" className="mx-[5px] !h-[25px] shrink-0 !self-center" />

      <ToolbarButton
        label="Markdown source"
        active={isSourceMode}
        onClick={onToggleSourceMode}
      >
        <FileCodeIcon />
      </ToolbarButton>
      {/* Line numbers only mean anything while the source is showing. */}
      {isSourceMode ? (
        <ToolbarButton
          label="Line numbers"
          active={showLineNumbers}
          onClick={onToggleLineNumbers}
        >
          <HashIcon />
        </ToolbarButton>
      ) : null}
      <ToolbarButton
        label={copied ? "Copied" : "Copy all text"}
        onClick={onCopyAll}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </ToolbarButton>
    </div>
  );
}

const HEADING_ICONS = [
  HeadingIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
] as const;

/**
 * One control for every heading level: the trigger shows the level in play,
 * and the menu offers the rest. Replaces a row of per-level buttons that only
 * ever covered two of the four levels the schema allows.
 */
function HeadingMenu({
  level,
  showActive,
  onSelect,
}: {
  level: number;
  showActive: boolean;
  onSelect: (level: number) => void;
}) {
  const Icon = HEADING_ICONS[level] ?? HeadingIcon;
  const active = showActive && level > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Heading level"
            title="Heading level"
            className={cn(
              "size-[27px] min-w-[27px] rounded-md text-editor-foreground hover:bg-secondary [&_svg:not([class*='size-'])]:size-[15px]",
              active && "bg-secondary text-foreground",
            )}
          />
        }
      >
        <Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuRadioGroup
          value={String(level)}
          onValueChange={(value) => onSelect(Number(value))}
        >
          <DropdownMenuRadioItem value="0">Body text</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="1">Heading 1</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="2">Heading 2</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="3">Heading 3</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="4">Heading 4</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LinkPopover({
  active,
  currentHref,
  onApply,
}: {
  active: boolean;
  currentHref: string;
  onApply: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function openWithCurrent() {
    setUrl(currentHref);
    setOpen(true);
  }

  function apply() {
    onApply(url.trim());
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? openWithCurrent() : setOpen(false))}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit link"
            title="Edit link"
            className={cn(active && "bg-accent text-accent-foreground")}
          />
        }
      >
        <Link2Icon />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
          className="flex gap-1"
        >
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            type="url"
            autoFocus
          />
          <Button type="submit" size="icon" aria-label="Apply link">
            <CheckIcon />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
