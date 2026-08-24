"use client";

import {
  FolderPlusIcon,
  CopyIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  BranchGlyph,
  CollectionGlyph,
  PageGlyph,
} from "@/features/workspace/nav-glyphs";
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
export type TreeDocument = {
  id: string;
  title: string;
  folderId: string | null;
};

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

/**
 * Row geometry mirrors the design reference exactly: 236px rail, 13px nav rows
 * at 8px/9px padding, 12px document rows indented 18px, all on an 8px radius.
 * Weight stays regular throughout — the active row separates by fill and
 * brightness, never by bolding.
 */
const NAV_ROW = [
  "h-auto gap-[9px] rounded-lg px-[9px] py-2 text-[13px] leading-[1.35] font-normal",
  "text-sidebar-foreground/85 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
  // The active collection carries the "+", which gives its row a taller line box.
  "data-active:bg-sidebar-accent data-active:py-[11px] data-active:font-normal data-active:text-sidebar-accent-foreground",
  "[&_svg]:size-[15px] [&_svg]:text-sidebar-foreground/70",
  "data-active:[&_svg]:text-sidebar-accent-foreground",
  // Room for the trailing "+" and the overflow control.
  "group-has-data-[sidebar=menu-action]/menu-item:pr-14",
  "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
].join(" ");

/** Trailing controls sit centred on the row rather than pinned to its top. */
const NAV_ACTION = [
  "top-1/2 right-[30px] w-6 -translate-y-1/2 rounded-md",
  "peer-data-[size=default]/menu-button:top-1/2 peer-data-[size=lg]/menu-button:top-1/2",
  "peer-data-[size=sm]/menu-button:top-1/2",
  "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "opacity-0 transition-opacity duration-150 group-focus-within/row:opacity-100",
  "group-hover/row:opacity-100 aria-expanded:opacity-100",
].join(" ");

/**
 * Nested documents sit on the bare sidebar background — no rail, no border.
 * The hierarchy is carried by the 18px indent and the ↳ connector alone.
 */
const NAV_SUB_ROW = [
  "h-auto translate-x-0 gap-[9px] rounded-lg px-[9px] py-2 pr-8 font-normal",
  "leading-[1.35] text-sidebar-foreground/70 data-[size=md]:text-[12px]",
  "hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
  "data-active:bg-transparent data-active:text-sidebar-foreground",
  "[&>svg]:size-[14px] [&>svg]:text-sidebar-foreground/55",
  "data-active:[&>svg]:text-sidebar-foreground/70",
].join(" ");

const SUB_ACTION = [
  "top-1/2 right-[5px] w-6 -translate-y-1/2 rounded-md",
  "peer-data-[size=default]/menu-button:top-1/2 peer-data-[size=lg]/menu-button:top-1/2",
  "peer-data-[size=sm]/menu-button:top-1/2",
  "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "opacity-0 transition-opacity duration-150 group-focus-within/menu-sub-item:opacity-100",
  "group-hover/menu-sub-item:opacity-100 aria-expanded:opacity-100",
].join(" ");

export function DocumentTree({
  folders,
  documents,
}: {
  folders: TreeFolder[];
  documents: TreeDocument[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [folderDialogFor, setFolderDialogFor] = useState<
    TreeFolder | "new" | null
  >(null);
  const [pendingFolderDelete, setPendingFolderDelete] =
    useState<PendingFolderDelete>(null);

  // The command palette and ⌘⌥C open this dialog from anywhere in the shell.
  useEffect(() => {
    function onNewCollection() {
      setFolderDialogFor("new");
    }
    window.addEventListener("editora:new-collection", onNewCollection);
    return () =>
      window.removeEventListener("editora:new-collection", onNewCollection);
  }, []);

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
    <SidebarGroup className="gap-0 px-[14px] pt-6 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
      {/* Section marker. Creation controls stay hidden until the row is
          hovered or focused so the resting state is just the label. */}
      <div className="group/section flex items-center justify-between px-[9px] pb-[7px] group-data-[collapsible=icon]:hidden">
        <span className="text-[10px] leading-[1.35] font-normal tracking-[0.12em] text-sidebar-foreground/60 uppercase">
          Collections
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/section:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New document"
            title="New document"
            className="-my-[5px] shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleNewDocument}
          >
            <PlusIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New collection"
            title="New collection"
            className="-my-[5px] shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setFolderDialogFor("new")}
          >
            <FolderPlusIcon />
          </Button>
        </div>
      </div>

      <SidebarMenu className="gap-0">
        {folders.map((folder, index) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            index={index}
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
          <li className="px-[9px] py-6 text-xs leading-relaxed text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
            No documents yet.
            <br />
            Use + above to create one.
          </li>
        ) : null}
      </SidebarMenu>

      <NameDialog
        key={
          folderDialogFor === "new" ? "new" : (folderDialogFor?.id ?? "closed")
        }
        open={folderDialogFor !== null}
        title={
          folderDialogFor === "new" ? "New collection" : "Rename collection"
        }
        description={
          folderDialogFor === "new"
            ? "Collections group related documents."
            : undefined
        }
        initialName={
          folderDialogFor && folderDialogFor !== "new"
            ? folderDialogFor.name
            : ""
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
              Documents inside this collection stay in the workspace root.
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
              Delete collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  );
}

function FolderNode({
  folder,
  index,
  documents,
  activePath,
  onRename,
  onDelete,
}: {
  folder: TreeFolder;
  index: number;
  documents: TreeDocument[];
  activePath: string;
  onRename: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
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
      {/* The row wrapper is the positioning context for the trailing
          controls — the <li> also contains the expanded children. */}
      <div className="group/row relative">
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={folder.name} isActive={hasActiveDoc} />
          }
          className={NAV_ROW}
        >
          <CollectionGlyph index={index} />
          <span className="truncate">{folder.name}</span>
        </CollapsibleTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuAction
                aria-label={`Actions for ${folder.name}`}
                className={NAV_ACTION}
              />
            }
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
              Delete collection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* The "+" is the collection's own action, so it stays visible while the
          collection is the active one and fades in on hover otherwise. */}
        <SidebarMenuAction
          aria-label={`New document in ${folder.name}`}
          title={`New document in ${folder.name}`}
          className={cn(
            NAV_ACTION,
            "right-[5px] text-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-primary [&>svg]:size-[15px] [&>svg]:stroke-[1.75]",
            hasActiveDoc && "opacity-100",
          )}
          onClick={() =>
            void runTreeAction(
              createDocumentAction(folder.id).then((result) => {
                if (result.ok) router.push(`/app/doc/${result.documentId}`);
                return result;
              }),
              router,
            )
          }
        >
          <PlusIcon />
        </SidebarMenuAction>
      </div>
      <CollapsibleContent>
        <SidebarMenuSub
          className={cn(
            "mx-0 translate-x-0 gap-0 border-l-0 px-0 py-0 pl-[18px]",
            // Only a populated collection earns the break before the next one.
            documents.length > 0 && "mb-[18px]",
          )}
        >
          {documents.map((doc) => {
            const active = activePath === `/app/doc/${doc.id}`;
            return (
              <SidebarMenuSubItem key={doc.id}>
                <SidebarMenuSubButton
                  render={<Link href={`/app/doc/${doc.id}`} />}
                  isActive={active}
                  className={NAV_SUB_ROW}
                >
                  <BranchGlyph />
                  <span className="truncate">{doc.title}</span>
                </SidebarMenuSubButton>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-[9px] size-[7px] -translate-y-1/2 rounded-full bg-sidebar-marker transition-opacity duration-150 group-focus-within/menu-sub-item:opacity-0 group-hover/menu-sub-item:opacity-0"
                  />
                ) : null}
                <DocumentActionsMenu
                  document={doc}
                  folders={[folder]}
                  className={SUB_ACTION}
                />
              </SidebarMenuSubItem>
            );
          })}
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
    <SidebarMenuItem className="group/row">
      <SidebarMenuButton
        render={<Link href={`/app/doc/${document.id}`} />}
        isActive={active}
        tooltip={document.title}
        className={NAV_ROW}
      >
        <PageGlyph />
        <span className="truncate">{document.title}</span>
      </SidebarMenuButton>
      {active ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-[13px] size-[7px] -translate-y-1/2 rounded-full bg-sidebar-marker transition-opacity duration-150 group-focus-within/row:opacity-0 group-hover/row:opacity-0"
        />
      ) : null}
      <DocumentActionsMenu
        document={document}
        folders={folders}
        className={cn(NAV_ACTION, "right-[5px]")}
      />
    </SidebarMenuItem>
  );
}

function DocumentActionsMenu({
  document,
  folders,
  className,
}: {
  document: TreeDocument;
  folders: TreeFolder[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuAction
            aria-label={`Actions for ${document.title}`}
            className={className}
          />
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
            Move to collection
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuItem
              onClick={() =>
                void runTreeAction(
                  moveDocumentAction(document.id, null),
                  router,
                )
              }
            >
              Workspace root
            </DropdownMenuItem>
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() =>
                  void runTreeAction(
                    moveDocumentAction(document.id, folder.id),
                    router,
                  )
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
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
