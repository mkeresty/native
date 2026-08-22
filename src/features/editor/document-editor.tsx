"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  BoldIcon,
  CheckIcon,
  CodeIcon,
  FileCodeIcon,
  FolderIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  QuoteIcon,
  StrikethroughIcon,
  MinusIcon,
  Share2Icon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveDocumentAction } from "@/features/documents/actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
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

type SaveStatus = "saved" | "dirty" | "saving" | "error";

export function DocumentEditor({
  document: initialDocument,
}: {
  document: {
    id: string;
    title: string;
    contentMd: string;
    folderName: string | null;
    authorName: string;
    updatedAt: Date;
  };
}) {
  const [title, setTitle] = useState(initialDocument.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"write" | "read">("write");
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(initialDocument.contentMd);
  // 0 = top of document, 1 = title fully compacted.
  const [scrollProgress, setScrollProgress] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const latestRef = useRef({
    documentId: initialDocument.id,
    title: initialDocument.title,
    contentMd: initialDocument.contentMd,
    dirty: false,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        indentation: { style: "space", size: 2 },
      }),
    ],
    content: initialDocument.contentMd,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-prose min-h-full outline-none",
        "aria-label": "Document content",
      },
    },
    onUpdate: ({ editor }) => {
      const md = editor.getMarkdown();
      // Transactions fire for selection-only changes and programmatic updates;
      // only real content differences count as edits.
      if (md === latestRef.current.contentMd) return;
      latestRef.current.contentMd = md;
      latestRef.current.dirty = true;
      setStatus("dirty");
    },
  });

  const flushSave = useCallback(async () => {
    const state = latestRef.current;
    if (!state.dirty) return;
    setStatus("saving");
    try {
      const result = await saveDocumentAction({
        documentId: state.documentId,
        title: state.title,
        contentMd: state.contentMd,
      });
      if (!result.ok) throw new Error(result.error);
      // Only clear dirty if nothing changed while saving.
      if (
        latestRef.current.title === state.title &&
        latestRef.current.contentMd === state.contentMd
      ) {
        latestRef.current.dirty = false;
        setStatus("saved");
        setSavedAt(new Date());
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-workspace">
      <header className="document-topbar flex h-20 shrink-0 items-center justify-between gap-4 border-b px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground sm:text-base">
          <FolderIcon className="shrink-0 text-sidebar-primary" />
          <span className="max-w-32 leading-tight sm:max-w-44">
            {initialDocument.folderName ?? "Workspace"}
          </span>
          <span aria-hidden className="text-lg">/</span>
          <span className="truncate leading-tight">{title || "Untitled"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveStatusIndicator status={status} savedAt={savedAt} />
          <Collaborators />
          <Button variant="outline" size="default" className="hidden sm:inline-flex">
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
              className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              Write
            </ToggleGroupItem>
            <ToggleGroupItem
              value="read"
              aria-label="Read mode"
              title="Read mode"
              className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              Read
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-editor-background"
      >
        <div className="mx-auto w-full max-w-3xl px-6 pt-8 pb-16 sm:px-10">
          <input
            value={title}
            onChange={(event) => markDirtyTitle(event.target.value)}
            onBlur={() => void flushSave()}
            readOnly={viewMode === "read"}
            placeholder="Untitled"
            aria-label="Document title"
            style={{ fontSize: `${2.75 - 0.95 * scrollProgress}rem` }}
            className="mt-2 w-full bg-transparent font-heading leading-tight font-medium tracking-[-0.04em] text-editor-foreground outline-none transition-[font-size] duration-75 ease-out placeholder:text-muted-foreground/60"
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <span>{initialDocument.authorName}</span>
            {readingTime ? (
              <>
                <span aria-hidden>·</span>
                <span>{readingTime} min read</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>Updated {formatRelativeTime(lastActivity)}</span>
          </div>
          {editor && viewMode === "write" ? (
            <>
              <div ref={toolbarSentinelRef} aria-hidden className="h-px" />
              <Toolbar
                editor={editor}
                isSourceMode={isSourceMode}
                onToggleSourceMode={toggleSourceMode}
                isStuck={isToolbarStuck}
                className="sticky top-2 z-10 mt-4 mb-6"
              />
              {isSourceMode ? (
                <textarea
                  value={markdownDraft}
                  onChange={(event) => handleMarkdownChange(event.target.value)}
                  onBlur={() => void flushSave()}
                  aria-label="Document markdown source"
                  spellCheck={false}
                  className="block min-h-140 w-full resize-none border-0 bg-code-background p-6 font-mono text-sm leading-7 text-code-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              ) : (
                <EditorContent editor={editor} />
              )}
            </>
        ) : editor ? (
            <EditorContent editor={editor} />
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

function Collaborators() {
  return (
    <AvatarGroup aria-label="Ada, Jordan, and Priya are collaborating">
      {[
        ["AL", "bg-presence-1"],
        ["JM", "bg-presence-2"],
        ["PK", "bg-presence-3"],
      ].map(([initials, color]) => (
        <Avatar key={initials} className="size-7 border-2 border-card">
          <AvatarFallback className={cn(color, "font-mono text-[10px] text-primary-foreground")}>
            {initials}
          </AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
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
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
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
      className={cn(active && "bg-accent text-accent-foreground")}
    >
      {children}
    </Button>
  );
}

function Toolbar({
  editor,
  isSourceMode,
  onToggleSourceMode,
  isStuck,
  className,
}: {
  editor: ReturnType<typeof useEditor>;
  isSourceMode: boolean;
  onToggleSourceMode: () => void;
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
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
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
      className={cn(
        "flex items-center gap-1 rounded-xl border border-toolbar-border bg-toolbar px-2 py-1 shadow-xs backdrop-blur",
        isStuck && "shadow-sm",
        className,
      )}
    >
      <ToolbarButton
        label="Bold (⌘B)"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Italic (⌘I)"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough (⌘⇧S)"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code (⌘E)"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <CodeIcon />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1.5 !h-4 !self-center opacity-70" />

      <ToolbarButton
        label="Heading 2"
        active={state.h2}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={state.h3}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        <Heading3Icon />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1.5 !h-4 !self-center opacity-70" />

      <ToolbarButton
        label="Bullet list (⌘⇧8)"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list (⌘⇧7)"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        active={state.taskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <QuoteIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <MinusIcon />
      </ToolbarButton>

      <LinkPopover active={state.link} editor={editor} />

      <Separator orientation="vertical" className="mx-1.5 !h-4 !self-center opacity-70" />

      <ToolbarButton
        label="Markdown source"
        active={isSourceMode}
        onClick={onToggleSourceMode}
      >
        <FileCodeIcon />
      </ToolbarButton>
    </div>
  );
}

function LinkPopover({
  active,
  editor,
}: {
  active: boolean;
  editor: NonNullable<ReturnType<typeof useEditor>>;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function openWithCurrent() {
    setUrl(editor.getAttributes("link").href ?? "");
    setOpen(true);
  }

  function apply() {
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.trim() })
        .run();
    }
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
