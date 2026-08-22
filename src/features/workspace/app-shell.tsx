"use client";

import { ChevronsUpDownIcon, CommandIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
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
    <SidebarProvider style={{ "--sidebar-width": "14.75rem" } as React.CSSProperties}>
      <SidebarKeyboardToggle />
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-[14px] pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
          <WorkspaceSwitcher workspaces={workspaces} />
        </SidebarHeader>
        <SidebarContent>
          <DocumentTree folders={folders} documents={documents} />
        </SidebarContent>
        {/* Anchored to the bottom of the sidebar, below a full-width rule —
            the navigation keeps whatever vertical space is left over. */}
        <SidebarFooter className="mt-auto gap-0 p-0 pb-5 group-data-[collapsible=icon]:pb-4">
          <div className="mx-[14px] h-px bg-sidebar-border group-data-[collapsible=icon]:mx-2" />
          <div className="px-[22px] pt-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
            <UserMenu user={user} />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-workspace">
        <div className="relative flex h-svh min-h-svh flex-col">
          {/* Lives in the shell rather than the document top bar so every page
              under /app has it. Positioned to land in the 57px top bar's left
              gutter — which the bar reserves via its extra left padding. */}
          <div className="absolute top-[15px] left-5 z-20 sm:left-7">
            <SidebarTrigger
              aria-label="Toggle sidebar (⌘\)"
              title="Toggle sidebar (⌘\)"
              className="size-[27px] rounded-md text-editor-muted-foreground hover:bg-secondary hover:text-foreground"
            />
          </div>
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
        render={
          <SidebarMenuButton
            size="lg"
            aria-label="Switch workspace"
            className="h-auto gap-2.5 rounded-lg px-[7px] py-[3px] text-[15px] font-bold hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
          />
        }
      >
        <span className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-heading text-[18px] font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:text-lg">
          A
        </span>
        <span className="truncate leading-[1.35] font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          atelier
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
            className="h-auto gap-2 rounded-lg px-0 py-0 text-xs hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
          />
        }
      >
        <Spinner
          className={cn("size-4", isPending ? "block" : "hidden")}
          aria-hidden={isPending ? undefined : true}
        />
        <Avatar className={cn("size-[25px]", isPending && "hidden")}>
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="bg-user-avatar text-[10px] font-extrabold text-sidebar-primary-foreground">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-normal text-sidebar-foreground/85 group-data-[collapsible=icon]:hidden">
          {user.name}
        </span>
        {/* Keyboard affordance: the row is the account menu's trigger. */}
        <CommandIcon className="ml-auto size-[17px] text-sidebar-primary group-data-[collapsible=icon]:hidden" />
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
        <DropdownMenuItem variant="destructive" onClick={() => void handleSignOut()}>
          <LogOutIcon />
          Sign out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
