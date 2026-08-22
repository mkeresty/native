"use client";

import {
  CopyIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  createDocumentAction,
  createFolderAction,
  deleteDocumentAction,
  deleteFolderAction,
  duplicateDocumentAction,
  moveDocumentAction,
  renameFolderAction,
} from "@/features/documents/actions";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type TreeFolder = { id: string; name: string };
export type TreeDocument = { id: string; title: string; folderId: string | null };

type PendingFolderDelete = TreeFolder | null;

export function DocumentTree({
  folders,
  documents,
}: {
  folders: TreeFolder[];
  documents: TreeDocument[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [folderDialogFor, setFolderDialogFor] = useState<TreeFolder | "new" | null>(
    null,
  );
  const [pendingFolderDelete, setPendingFolderDelete] =
    useState<PendingFolderDelete>(null);

  const rootDocuments = documents.filter((doc) => doc.folderId === null);

  async function handleNewDocument() {
    const result = await createDocumentAction(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.push(`/app/doc/${result.documentId}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
      <div className="group/tree flex items-center justify-between px-1.5 py-1.5">
        <p className="text-xs font-medium text-muted-foreground">Documents</p>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/tree:opacity-100 group-hover/tree:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New document"
            title="New document"
            onClick={() => void handleNewDocument()}
          >
            <PlusIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New folder"
            title="New folder"
            onClick={() => setFolderDialogFor("new")}
          >
            <FolderPlusIcon />
          </Button>
        </div>
      </div>

      {folders.length === 0 && documents.length === 0 ? (
        <p className="rounded-lg px-2 py-6 text-center text-xs text-muted-foreground">
          No documents yet. Use the + buttons above to create one.
        </p>
      ) : (
        <nav aria-label="Documents" className="flex flex-col gap-0.5">
          {folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              documents={documents.filter((doc) => doc.folderId === folder.id)}
              activePath={pathname}
              onRename={() => setFolderDialogFor(folder)}
              onDelete={() => setPendingFolderDelete(folder)}
            />
          ))}
          {rootDocuments.map((doc) => (
            <DocumentNode
              key={doc.id}
              document={doc}
              folders={folders}
              active={pathname === `/app/doc/${doc.id}`}
            />
          ))}
        </nav>
      )}

      <NameDialog
        key={folderDialogFor === "new" ? "new" : (folderDialogFor?.id ?? "closed")}
        open={folderDialogFor !== null}
        title={folderDialogFor === "new" ? "New folder" : "Rename folder"}
        description={
          folderDialogFor === "new" ? "Folders group related documents." : undefined
        }
        initialName={
          folderDialogFor && folderDialogFor !== "new" ? folderDialogFor.name : ""
        }
        submitLabel={folderDialogFor === "new" ? "Create" : "Save"}
        onOpenChange={(open) => !open && setFolderDialogFor(null)}
        onSubmit={async (name) => {
          if (folderDialogFor === "new") {
            return createFolderAction(name);
          }
          if (folderDialogFor) {
            return renameFolderAction(folderDialogFor.id, name);
          }
          return { ok: false as const, error: "Nothing to save" };
        }}
      />

      <AlertDialog
        open={pendingFolderDelete !== null}
        onOpenChange={(open) => !open && setPendingFolderDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingFolderDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Documents inside this folder stay in the workspace root.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void (async () => {
                  if (!pendingFolderDelete) return;
                  const result = await deleteFolderAction(pendingFolderDelete.id);
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                  setPendingFolderDelete(null);
                })()
              }
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FolderNode({
  folder,
  documents,
  activePath,
  onRename,
  onDelete,
}: {
  folder: TreeFolder;
  documents: TreeDocument[];
  activePath: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <details className="group/folder">
      <summary className="flex cursor-default list-none items-center gap-1.5 rounded-md px-1.5 py-1 text-sm hover:bg-sidebar-accent [&::-webkit-details-marker]:hidden">
        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground group-open/folder:hidden" />
        <FolderOpenIcon className="hidden size-3.5 shrink-0 text-muted-foreground group-open/folder:block" />
        <span className="truncate font-medium">{folder.name}</span>
        <FolderMenu
          folder={folder}
          onRename={onRename}
          onDelete={onDelete}
        />
      </summary>
      <div className="ml-3 flex flex-col gap-0.5 border-l pl-1.5">
        {documents.map((doc) => (
          <DocumentNode
            key={doc.id}
            document={doc}
            folders={[folder]}
            active={activePath === `/app/doc/${doc.id}`}
          />
        ))}
        {documents.length === 0 ? (
          <p className="px-1.5 py-1 text-xs text-muted-foreground">Empty</p>
        ) : null}
      </div>
    </details>
  );
}

function DocumentNode({
  document,
  folders,
  active,
}: {
  document: TreeDocument;
  folders: TreeFolder[];
  active: boolean;
}) {
  const router = useRouter();

  async function runAction(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    const result = await action();
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  return (
    <div
      className={cn(
        "group/doc flex min-w-0 items-center rounded-md hover:bg-sidebar-accent",
        active && "bg-sidebar-accent",
      )}
    >
      <Link
        href={`/app/doc/${document.id}`}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none",
          active && "font-medium text-sidebar-accent-foreground",
        )}
      >
        <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{document.title}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${document.title}`}
              className="opacity-0 transition-opacity group-hover/doc:opacity-100 focus-visible:opacity-100"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-44">
          <DropdownMenuItem
            onSelect={() => void runAction(() => duplicateDocumentAction(document.id))}
          >
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderIcon />
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuItem
                onSelect={() =>
                  void runAction(() => moveDocumentAction(document.id, null))
                }
              >
                Workspace root
              </DropdownMenuItem>
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onSelect={() =>
                    void runAction(() => moveDocumentAction(document.id, folder.id))
                  }
                >
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              void runAction(() => deleteDocumentAction(document.id))
            }
          >
            <Trash2Icon />
            Delete document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FolderMenu({
  folder,
  onRename,
  onDelete,
}: {
  folder: TreeFolder;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Actions for ${folder.name}`}
            className="ml-auto opacity-0 transition-opacity group-hover/folder:opacity-100 focus-visible:opacity-100"
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-40">
        <DropdownMenuItem onSelect={onRename}>
          <PencilIcon />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2Icon />
          Delete folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NameDialog({
  open,
  title,
  description,
  initialName,
  submitLabel,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  initialName: string;
  submitLabel: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    name: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await onSubmit(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field data-invalid={!name.trim() || undefined}>
              <FieldLabel htmlFor="item-name">Name</FieldLabel>
              <Input
                id="item-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Untitled"
                autoFocus
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
