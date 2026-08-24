import { redirect } from "next/navigation";

import { AppShell } from "@/features/workspace/app-shell";
import { db } from "@/db";
import { getAuth } from "@/lib/auth/server";
import { getApplicationUserId } from "@/lib/auth/profile";
import { listWorkspaceTree } from "@/lib/documents/server";
import { createDefaultWorkspace, getUserWorkspaces } from "@/lib/workspaces/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await getAuth().getSession();
  if (!session?.user) redirect("/sign-in");

  const userId = await getApplicationUserId(session.user);

  let workspaces = await getUserWorkspaces(userId);
  if (workspaces.length === 0) {
    // Neon Auth has no app-specific database hooks. Provision on the first
    // authenticated app request, after its local profile is ready.
    await createDefaultWorkspace(db, userId, session.user.name);
    workspaces = await getUserWorkspaces(userId);
  }

  const activeWorkspace = workspaces[0];
  const tree = await listWorkspaceTree(userId, activeWorkspace.id);

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      workspaces={workspaces}
      folders={tree.folders}
      documents={tree.documents}
    >
      {children}
    </AppShell>
  );
}
