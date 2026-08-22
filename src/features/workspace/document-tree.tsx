"use client";

import {
  FolderPlusIcon,
  CopyIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export type TreeFolder = { id: string; name: string };
export type TreeDocument = { id: string; title: string; folderId: string | null };

type PendingFolderDelete = TreeFolder | null;

type ActionResult = { ok: true } | { ok: false; error: string };

async function runTreeAction(
  action: Promise<ActionResult>,
  router: ReturnType<typeof useRouter>,
) {
  const result = await action;
  if (!result.ok) toast.error(result.error);
  else router.refresh();
}

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

  function handleNewDocument() {
    void runTreeAction(
      createDocumentAction(null).then((result) => {
        if (result.ok) router.push(`/app/doc/${result.documentId}`);
        return result;
      }),
      router,
    );
  }

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:hidden">
        <span className="text-xs font-medium text-sidebar-foreground/70">
          Documents
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New document"
            title="New document"
            onClick={handleNewDocument}
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

      <SidebarMenu>
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
        {folders.length === 0 && documents.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            No documents yet.
            <br />
            Use + above to create one.
          </li>
        ) : null}
      </SidebarMenu>

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
            <AlertDialogTitle>
              Delete “{pendingFolderDelete?.name}”?
            </AlertDialogTitle>
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
                  await runTreeAction(
                    deleteFolderAction(pendingFolderDelete.id),
                    router,
                  );
                  setPendingFolderDelete(null);
                })()
              }
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
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
  const hasActiveDoc = documents.some(
    (doc) => activePath === `/app/doc/${doc.id}`,
  );

  return (
    // Base UI composition: Collapsible renders the <li> itself.
    <Collapsible
      defaultOpen
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={folder.name} />}>
        {hasActiveDoc ? <FolderOpenIcon /> : <FolderIcon />}
        <span className="truncate">{folder.name}</span>
      </CollapsibleTrigger>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<SidebarMenuAction aria-label={`Actions for ${folder.name}`} />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-40">
          <DropdownMenuItem onClick={onRename}>
            <PencilIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CollapsibleContent>
        <SidebarMenuSub>
          {documents.map((doc) => (
            <SidebarMenuSubItem key={doc.id}>
              <SidebarMenuSubButton
                render={<Link href={`/app/doc/${doc.id}`} />}
                isActive={activePath === `/app/doc/${doc.id}`}
              >
                <span className="truncate">{doc.title}</span>
              </SidebarMenuSubButton>
              <DocumentActionsMenu document={doc} folders={[folder]} />
            </SidebarMenuSubItem>
          ))}
          {documents.length === 0 ? (
            <li className="px-2 py-1 text-xs text-muted-foreground">Empty</li>
          ) : null}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
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
  return (
    <SidebarMenuItem>
      <SidebarMenuButton render={<Link href={`/app/doc/${document.id}`} />} isActive={active} tooltip={document.title}>
        <FileTextIcon />
        <span className="truncate">{document.title}</span>
      </SidebarMenuButton>
      <DocumentActionsMenu document={document} folders={folders} />
    </SidebarMenuItem>
  );
}

function DocumentActionsMenu({
  document,
  folders,
}: {
  document: TreeDocument;
  folders: TreeFolder[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuAction aria-label={`Actions for ${document.title}`} />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-44">
        <DropdownMenuItem
          onClick={() =>
            void runTreeAction(duplicateDocumentAction(document.id), router)
          }
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
              onClick={() =>
                void runTreeAction(moveDocumentAction(document.id, null), router)
              }
            >
              Workspace root
            </DropdownMenuItem>
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() =>
                  void runTreeAction(moveDocumentAction(document.id, folder.id), router)
                }
              >
                {folder.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            void (async () => {
              const result = await deleteDocumentAction(document.id);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              // Leave the deleted document's page if we were on it.
              if (pathname === `/app/doc/${document.id}`) {
                router.push("/app");
              }
              router.refresh();
            })()
          }
        >
          <Trash2Icon />
          Delete document
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
  onSubmit: (name: string) => Promise<ActionResult>;
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
