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
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveDocumentAction } from "@/features/documents/actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 900;

type SaveStatus = "saved" | "dirty" | "saving" | "error";

export function DocumentEditor({
  document: initialDocument,
}: {
  document: { id: string; title: string; contentMd: string };
}) {
  const [title, setTitle] = useState(initialDocument.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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
      latestRef.current.contentMd = editor.getMarkdown();
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

  const markDirtyTitle = useCallback((value: string) => {
    setTitle(value);
    latestRef.current.title = value;
    latestRef.current.dirty = true;
    setStatus("dirty");
  }, []);

  const markDirtyContent = useCallback(() => {
    setStatus("dirty");
  }, []);

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-1 border-b px-6 pt-5 pb-3">
        <input
          value={title}
          onChange={(event) => markDirtyTitle(event.target.value)}
          onBlur={() => void flushSave()}
          placeholder="Untitled"
          aria-label="Document title"
          className="w-full bg-transparent text-2xl font-semibold tracking-tight text-editor-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <div className="flex items-center justify-between gap-3">
          <SaveStatusIndicator status={status} savedAt={savedAt} />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => void handleExport()}>
              Export .md
            </Button>
          </div>
        </div>
      </header>

      {editor ? (
        <>
          <Toolbar editor={editor} />
          <div className="min-h-0 flex-1 overflow-y-auto bg-editor-background px-6 py-8">
            <div className="mx-auto w-full max-w-3xl">
              <EditorContent editor={editor} onBlur={markDirtyContent} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading editor…
        </div>
      )}
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
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full transition-colors",
          status === "error"
            ? "bg-destructive"
            : status === "saved"
              ? "bg-emerald-500 dark:bg-emerald-400"
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
      size="icon-sm"
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

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
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
    <div className="flex items-center gap-0.5 border-b bg-toolbar px-4 py-1.5">
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
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <CodeIcon />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 !h-4" />

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

      <Separator orientation="vertical" className="mx-1 !h-4" />

      <ToolbarButton
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
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
