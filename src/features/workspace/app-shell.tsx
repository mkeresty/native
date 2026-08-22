"use client";

import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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

export function AppShell({
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
  return (
    <SidebarProvider>
      <SidebarKeyboardToggle />
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <WorkspaceSwitcher workspaces={workspaces} />
        </SidebarHeader>
        <SidebarContent>
          <DocumentTree folders={folders} documents={documents} />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-1">
            <UserMenu user={user} />
            <ThemeToggle />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="flex h-svh min-h-svh flex-col">
          <header className="flex h-9 shrink-0 items-center gap-1 border-b px-1.5">
            <SidebarTrigger aria-label="Toggle sidebar (⌘\)" title="Toggle sidebar (⌘\)" />
          </header>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** ⌘/Ctrl + \ toggles the sidebar until the central shortcut registry lands (Phase 3). */
function SidebarKeyboardToggle() {
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  return null;
}

function WorkspaceSwitcher({ workspaces }: { workspaces: WorkspaceSummary[] }) {
  const activeWorkspace = workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<SidebarMenuButton size="lg" aria-label="Switch workspace" />}
      >
        <span className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          {activeWorkspace.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate font-medium">{activeWorkspace.name}</span>
        <ChevronsUpDownIcon className="ml-auto opacity-60" />
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
          />
        }
      >
        <Spinner
          className={isPending ? "block" : "hidden"}
          aria-hidden={isPending ? undefined : true}
        />
        <Avatar className={isPending ? "hidden" : ""}>
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void handleSignOut()}>
          <LogOutIcon />
          Sign out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
