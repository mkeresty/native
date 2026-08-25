"use client";

import {
  FileTextIcon,
  FolderPlusIcon,
  HomeIcon,
  LogOutIcon,
  MoonStarIcon,
  PanelLeftIcon,
  PlusIcon,
  UserPlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { createDocumentAction } from "@/features/documents/actions";
import { useCommandPalette } from "@/features/command-palette/command-palette-provider";
import { useFocusMode } from "@/features/workspace/ui-state";
import { useSidebar } from "@/components/ui/sidebar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { formatShortcut } from "@/lib/shortcuts/registry";

export type PaletteDocument = { id: string; title: string };

type Props = {
  documents: PaletteDocument[];
  onInvite?: () => void;
};

export function CommandPalette({ documents, onInvite }: Props) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const { focused, toggle: toggleFocusMode } = useFocusMode();
  const { isOpen, mode, setOpen } = useCommandPalette();

  async function handleNewDocument(folderId: string | null = null) {
    const result = await createDocumentAction(folderId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    router.push(`/app/doc/${result.documentId}`);
    router.refresh();
  }

  function handleSignOut() {
    void (async () => {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error("Could not sign out. Please try again.");
        return;
      }
      setOpen(false);
      router.replace("/sign-in");
      router.refresh();
    })();
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(next) => setOpen(next)}
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder={
          mode === "documents"
            ? "Jump to document…"
            : "Type a command or search…"
        }
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {documents.length > 0 ? (
          <CommandGroup
            heading={mode === "documents" ? "Documents" : "Quick open"}
          >
            {documents.map((doc) => (
              <CommandItem
                key={doc.id}
                value={`document ${doc.title}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/app/doc/${doc.id}`);
                }}
              >
                <FileTextIcon />
                <span className="truncate">{doc.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {mode === "all" ? (
          <>
            {documents.length > 0 ? <CommandSeparator /> : null}

            <CommandGroup heading="Create">
              <CommandItem onSelect={() => void handleNewDocument(null)}>
                <PlusIcon />
                New document
                <span className="text-xs tracking-widest text-muted-foreground ml-auto">
                  {formatShortcut("newDocument")}
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  window.dispatchEvent(
                    new CustomEvent("editora:new-collection"),
                  );
                  setOpen(false);
                }}
              >
                <FolderPlusIcon />
                New collection
                <span className="text-xs tracking-widest text-muted-foreground ml-auto">
                  {formatShortcut("newCollection")}
                </span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Workspace">
              {onInvite ? (
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onInvite();
                  }}
                >
                  <UserPlusIcon />
                  Invite collaborator
                </CommandItem>
              ) : null}
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/app");
                }}
              >
                <HomeIcon />
                Workspace home
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="View">
              <CommandItem
                onSelect={() => {
                  toggleFocusMode();
                  setOpen(false);
                }}
              >
                <MoonStarIcon />
                {focused ? "Exit focus mode" : "Enter focus mode"}
                <span className="text-xs tracking-widest text-muted-foreground ml-auto">
                  {formatShortcut("focusMode")}
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  toggleSidebar();
                  setOpen(false);
                }}
              >
                <PanelLeftIcon />
                Toggle sidebar
                <span className="text-xs tracking-widest text-muted-foreground ml-auto">
                  {formatShortcut("toggleSidebar")}
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setTheme("dark");
                  setOpen(false);
                }}
              >
                Dark theme
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setTheme("light");
                  setOpen(false);
                }}
              >
                Light theme
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setTheme("system");
                  setOpen(false);
                }}
              >
                System theme
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Account">
              <CommandItem onSelect={handleSignOut}>
                <LogOutIcon />
                Sign out
                <span className="text-xs tracking-widest text-muted-foreground ml-auto">
                  {formatShortcut("signOut")}
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
