/**
 * Test-support only: adds an existing user to another user's primary
 * workspace. Used by the multiplayer E2E gate until workspace invitations
 * exist as a product feature. Never wired into the app itself.
 *
 * Usage: bun scripts/e2e-add-member.ts <memberEmail> <ownerEmail>
 */
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { workspaceMember, user } from "@/db/schema";

async function userIdForEmail(email: string): Promise<string> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!row) throw new Error(`No user with email ${email}`);
  return row.id;
}

async function main() {
  const [memberEmail, ownerEmail] = process.argv.slice(2);
  if (!memberEmail || !ownerEmail) {
    throw new Error("usage: bun scripts/e2e-add-member.ts <memberEmail> <ownerEmail>");
  }

  const memberId = await userIdForEmail(memberEmail);
  const [workspace] = await db
    .select({ id: workspaceMember.workspaceId })
    .from(workspaceMember)
    .innerJoin(user, eq(user.id, workspaceMember.userId))
    .where(and(eq(user.email, ownerEmail), eq(workspaceMember.role, "owner")))
    .orderBy(asc(workspaceMember.createdAt))
    .limit(1);
  if (!workspace) throw new Error(`No owned workspace for ${ownerEmail}`);

  await db
    .insert(workspaceMember)
    .values({
      workspaceId: workspace.id,
      userId: memberId,
      role: "member",
    })
    .onConflictDoNothing();

  console.log(`added ${memberEmail} to workspace ${workspace.id}`);
  process.exit(0);
}

void main();
