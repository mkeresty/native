import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { AppShell } from "@/features/workspace/app-shell";
import { db } from "@/db";
import { auth } from "@/lib/auth/server";
import { listWorkspaceTree } from "@/lib/documents/server";
import { createDefaultWorkspace, getUserWorkspaces } from "@/lib/workspaces/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  let workspaces = await getUserWorkspaces(session.user.id);
  if (workspaces.length === 0) {
    // Self-heal for accounts created before the signup hook existed.
    await createDefaultWorkspace(db, session.user.id, session.user.name);
    workspaces = await getUserWorkspaces(session.user.id);
  }

  const activeWorkspace = workspaces[0];
  const tree = await listWorkspaceTree(session.user.id, activeWorkspace.id);

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
