"use client";

import { ChevronsUpDownIcon, LogOutIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  DocumentTree,
  type TreeDocument,
  type TreeFolder,
} from "@/features/workspace/document-tree";
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/features/command-palette/command-palette-provider";
import { CommandPalette } from "@/features/command-palette/command-palette";
import { InviteDialog } from "@/features/workspace/invite-dialog";
import { ShortcutsHelpDialog } from "@/features/command-palette/shortcuts-help-dialog";
import { FocusModeProvider, useFocusMode } from "@/features/workspace/ui-state";
import { createDocumentAction } from "@/features/documents/actions";
import { formatShortcut } from "@/lib/shortcuts/registry";
import { useGlobalShortcuts } from "@/lib/shortcuts/use-shortcuts";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "member";
};

type ShellUser = {
  name: string;
  email: string;
  image: string | null;
};

export function AppShell(props: {
  user: ShellUser;
  workspaces: WorkspaceSummary[];
  folders: TreeFolder[];
  documents: TreeDocument[];
  children: React.ReactNode;
}) {
  return (
    <FocusModeProvider>
      <CommandPaletteProvider>
        <ShellInner {...props} />
      </CommandPaletteProvider>
    </FocusModeProvider>
  );
}

function ShellInner({
  user,
  workspaces,
  folders,
  documents,
  children,
}: {
  user: ShellUser;
  workspaces: WorkspaceSummary[];
  folders: TreeFolder[];
  documents: TreeDocument[];
  children: React.ReactNode;
}) {
  const { focused } = useFocusMode();
  const [helpOpen, setHelpOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const activeWorkspace = workspaces[0];

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "14.75rem" } as React.CSSProperties}
    >
      <AppShortcuts onShowHelp={() => setHelpOpen(true)} />
      <FocusModeSidebarSync />
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-[14px] pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
          <WorkspaceSwitcher
            workspaces={workspaces}
            onInvite={() => setInviteOpen(true)}
          />
        </SidebarHeader>
        <SidebarContent>
          <DocumentTree folders={folders} documents={documents} />
        </SidebarContent>
        {/* Anchored to the bottom of the sidebar — the quick-menu hint sits
            just above the rule, the profile below it. The navigation keeps
            whatever vertical space is left over. */}
        <SidebarFooter className="mt-auto gap-0 p-0 pb-5 group-data-[collapsible=icon]:pb-4">
          <div className="px-[22px] pb-2.5 group-data-[collapsible=icon]:px-2">
            <QuickMenuHint />
          </div>
          <div className="mx-[14px] h-px bg-sidebar-border group-data-[collapsible=icon]:mx-2" />
          <div className="pt-4 px-[22px] group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
            <UserMenu user={user} />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-workspace">
        <div className="relative flex h-svh min-h-svh flex-col">
          {/* Lives in the shell rather than the document top bar so every page
              under /app has it. Positioned to land in the 57px top bar's left
              gutter — which the bar reserves via its extra left padding.
              Hidden in focus mode so the document is the only thing on screen. */}
          {!focused ? (
            <div className="absolute top-[15px] left-5 z-20 sm:left-7">
              <SidebarTrigger
                aria-label={"Toggle sidebar (⌘\\)"}
                title={"Toggle sidebar (⌘\\)"}
                className="size-[27px] rounded-md text-editor-muted-foreground hover:bg-secondary hover:text-foreground"
              />
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
        {focused ? <ExitFocusButton /> : null}
      </SidebarInset>
      <CommandPalette
        documents={documents}
        onInvite={activeWorkspace ? () => setInviteOpen(true) : undefined}
      />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      {activeWorkspace ? (
        <InviteDialog
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      ) : null}
    </SidebarProvider>
  );
}

/** Quiet affordance that teaches ⌘K and opens the palette on click. */
const subscribeNoop = () => () => {};

function QuickMenuHint() {
  const { open } = useCommandPalette();
  // Client-only value: SSR renders "" and hydration swaps to the platform
  // combo without a text mismatch or a cascading set-state effect.
  const shortcut = useSyncExternalStore(
    subscribeNoop,
    () => formatShortcut("palette"),
    () => "",
  );

  return (
    <button
      type="button"
      onClick={() => open("all")}
      aria-label="Open quick menu"
      className="flex h-7 w-full items-center gap-2 rounded-lg px-1 text-[11px] text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <SearchIcon className="size-[13px] shrink-0" />
      <span className="truncate group-data-[collapsible=icon]:hidden">
        Quick menu
      </span>
      <kbd className="ml-auto hidden font-mono text-[10px] tracking-widest text-sidebar-foreground/45 transition-colors group-hover:text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden sm:inline-flex">
        {shortcut}
      </kbd>
    </button>
  );
}

/** Registry-driven global shortcuts (see src/lib/shortcuts/registry.ts). */
function AppShortcuts({ onShowHelp }: { onShowHelp: () => void }) {
  const { open } = useCommandPalette();
  const { toggle: toggleFocusMode } = useFocusMode();
  const { toggleSidebar } = useSidebar();
  const router = useRouter();

  const handlers = useMemo(
    () => ({
      palette: () => open("all"),
      quickOpen: () => open("documents"),
      shortcutsHelp: onShowHelp,
      toggleSidebar,
      focusMode: toggleFocusMode,
      newDocument: () => {
        void (async () => {
          const result = await createDocumentAction(null);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          router.push(`/app/doc/${result.documentId}`);
          router.refresh();
        })();
      },
      newCollection: () =>
        window.dispatchEvent(new CustomEvent("editora:new-collection")),
      signOut: () => {
        void (async () => {
          const { error } = await authClient.signOut();
          if (error) {
            toast.error("Could not sign out. Please try again.");
            return;
          }
          router.replace("/sign-in");
          router.refresh();
        })();
      },
    }),
    [open, onShowHelp, toggleFocusMode, toggleSidebar, router],
  );

  useGlobalShortcuts(handlers);
  return null;
}

/** Focus mode keeps the sidebar out of the way until it is toggled again. */
function FocusModeSidebarSync() {
  const { focused, setFocused } = useFocusMode();
  const { setOpen } = useSidebar();
  const wasFocused = useRef(false);

  useEffect(() => {
    if (focused === wasFocused.current) return;
    wasFocused.current = focused;
    setOpen(!focused);
  }, [focused, setOpen]);

  // Escape always leaves focus mode.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && focused) setFocused(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused, setFocused]);

  return null;
}

function ExitFocusButton() {
  const { setFocused } = useFocusMode();

  return (
    <Button
      variant="outline"
      size="sm"
      className="fixed right-5 bottom-5 z-40 rounded-full shadow-sm"
      onClick={() => setFocused(false)}
    >
      Exit focus
      <span className="ml-1 text-xs text-muted-foreground">⌘.</span>
    </Button>
  );
}

function WorkspaceSwitcher({
  workspaces,
  onInvite,
}: {
  workspaces: WorkspaceSummary[];
  onInvite: () => void;
}) {
  const activeWorkspace = workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            aria-label="Switch workspace"
            className="h-auto gap-2.5 rounded-lg px-[7px] py-[3px] text-[15px] font-bold hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
          />
        }
      >
        <span className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-heading text-[18px] font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:text-lg">
          {activeWorkspace ? initials(activeWorkspace.name).charAt(0) : "—"}
        </span>
        <span className="truncate leading-[1.35] font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          {activeWorkspace?.name ?? "Workspace"}
        </span>
        <ChevronsUpDownIcon className="ml-auto size-3.5 opacity-0 transition-opacity duration-150 group-hover/menu-button:opacity-50 group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id}>
              <span className="truncate">{workspace.name}</span>
              {workspace.id === activeWorkspace.id ? (
                <DropdownMenuShortcut>Current</DropdownMenuShortcut>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {activeWorkspace ? (
          <>
            <DropdownMenuSeparator />
            {/* Base UI Menu items take onClick (not Radix's onSelect). */}
            <DropdownMenuItem onClick={onInvite}>
              <UserPlusIcon />
              Invite people
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function UserMenu({ user }: { user: ShellUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("Could not sign out. Please try again.");
      return;
    }
    startTransition(() => {
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            aria-label={`Account: ${user.name}`}
            disabled={isPending}
            className="h-auto gap-2 rounded-lg px-0 py-0 text-xs hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
          />
        }
      >
        <Spinner
          className={cn("size-4", isPending ? "block" : "hidden")}
          aria-hidden={isPending ? undefined : true}
        />
        <Avatar
          className={cn(
            "size-[25px] group-data-[collapsible=icon]:size-8",
            isPending && "hidden",
          )}
        >
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="bg-user-avatar text-[10px] font-extrabold text-sidebar-primary-foreground group-data-[collapsible=icon]:text-[11px]">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-normal text-sidebar-foreground/85 group-data-[collapsible=icon]:hidden">
          {user.name}
        </span>
        {/* Keyboard affordance: the row is the account menu's trigger. */}
        {/* Click affordance: the row opens the account menu on click. */}
        <ChevronsUpDownIcon className="ml-auto size-[17px] text-sidebar-primary group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as string)}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleSignOut()}
        >
          <LogOutIcon />
          Sign out
          <DropdownMenuShortcut>{formatShortcut("signOut")}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
