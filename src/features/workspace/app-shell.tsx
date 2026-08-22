"use client";

import { ChevronsUpDownIcon, LogOutIcon, PanelLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const activeWorkspace = workspaces[0];
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => setCollapsed((value) => !value), []);

  // ⌘/Ctrl + \ toggles the sidebar. Registered here until the central
  // shortcut registry lands with the command palette (Phase 3).
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

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <aside
        data-collapsed={collapsed}
        className="flex h-full shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out data-[collapsed=true]:w-0 data-[collapsed=false]:w-64"
      >
        <div className="flex h-full w-64 flex-col">
          {/* Workspace selector */}
          <div className="flex items-center gap-1 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-9 min-w-0 flex-1 justify-start px-1.5"
                  />
                }
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  {activeWorkspace.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate font-medium">{activeWorkspace.name}</span>
                <ChevronsUpDownIcon className="ml-auto opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map((workspace) => (
                  <DropdownMenuItem key={workspace.id}>
                    <span className="truncate">{workspace.name}</span>
                    {workspace.id === activeWorkspace.id ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Current
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <PanelLeftIcon />
            </Button>
          </div>

          {/* Document tree */}
          <DocumentTree folders={folders} documents={documents} />

          {/* User controls */}
          <div className="flex items-center gap-1 border-t p-2">
            <UserMenu user={user} />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
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
          <Button
            variant="ghost"
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
          {user.image ? (
            <AvatarImage src={user.image} alt="" />
          ) : null}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col items-start">
          <span className="w-full truncate text-sm font-medium">{user.name}</span>
          <span className="w-full truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
