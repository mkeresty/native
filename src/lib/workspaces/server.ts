import { and, asc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { db } from "@/db";
import type * as schema from "@/db/schema";
import { workspace, workspaceInvite, workspaceMember } from "@/db/schema";
import { slugify } from "@/lib/utils/slugify";

type Database = PostgresJsDatabase<typeof schema>;

/**
 * Provisions the default workspace for a brand-new profile. The first load of
 * /app can render the layout more than once concurrently, so this is
 * serialized per user with a transaction-scoped advisory lock: the second
 * caller waits, finds the first caller's workspace, and returns it instead of
 * racing it to a duplicate slug.
 */
export async function createDefaultWorkspace(
  database: Database,
  userId: string,
  userName: string,
) {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);

    const [existingMembership] = await tx
      .select({ workspaceId: workspace.id, name: workspace.name, slug: workspace.slug })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
      .where(eq(workspaceMember.userId, userId))
      .orderBy(asc(workspace.createdAt))
      .limit(1);
    if (existingMembership) return existingMembership;

    const baseName = `${userName.split(" ")[0] || "My"}'s Workspace`;

    for (let attempt = 0; attempt < 5; attempt++) {
      const base = slugify(baseName);
      const slug =
        attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`;

      const [created] = await tx
        .insert(workspace)
        .values({ name: baseName, slug, createdBy: userId })
        .onConflictDoNothing({ target: workspace.slug })
        .returning();

      if (created) {
        await tx
          .insert(workspaceMember)
          .values({ workspaceId: created.id, userId, role: "owner" });
        return created;
      }
      // Slug taken by someone else's workspace — try a fresh suffix.
    }

    throw new Error("Could not provision a default workspace");
  });
}

export async function getUserWorkspaces(userId: string) {
  return db
    .select({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
    .where(eq(workspaceMember.userId, userId))
    .orderBy(asc(workspace.createdAt));
}

/* --------------------------------------------------------------------- */
/* Invites                                                               */
/* --------------------------------------------------------------------- */

function requireMembershipId(userId: string, workspaceId: string) {
  return db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    )
    .limit(1);
}

/** 128 bits of entropy, URL-safe — the only secret gating workspace access. */
function generateInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/**
 * Returns the workspace's active invite token, creating one if none exists.
 * Any workspace member may share the link; regenerating is the revoke path.
 */
export async function getOrCreateWorkspaceInvite(
  userId: string,
  workspaceId: string,
): Promise<{ token: string } | null> {
  const [member] = await requireMembershipId(userId, workspaceId);
  if (!member) return null;

  const [existing] = await db
    .select({ token: workspaceInvite.token })
    .from(workspaceInvite)
    .where(eq(workspaceInvite.workspaceId, workspaceId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(workspaceInvite)
    .values({
      workspaceId,
      token: generateInviteToken(),
      createdBy: userId,
    })
    .onConflictDoNothing()
    .returning({ token: workspaceInvite.token });
  if (created) return created;

  // A concurrent member created the link first; serve theirs.
  const [raced] = await db
    .select({ token: workspaceInvite.token })
    .from(workspaceInvite)
    .where(eq(workspaceInvite.workspaceId, workspaceId))
    .limit(1);
  return raced ?? null;
}

/** Revokes the current link by regenerating it. Members only. */
export async function regenerateWorkspaceInvite(
  userId: string,
  workspaceId: string,
): Promise<{ token: string } | null> {
  const [member] = await requireMembershipId(userId, workspaceId);
  if (!member) return null;

  await db
    .delete(workspaceInvite)
    .where(eq(workspaceInvite.workspaceId, workspaceId));
  return getOrCreateWorkspaceInvite(userId, workspaceId);
}

export type RedeemInviteResult =
  | { ok: true; workspaceId: string; workspaceName: string; alreadyMember: boolean }
  | { ok: false; error: "not_found" | "already_member_other_workspace" };

/**
 * Redeems a join link for the given profile: adds them to the workspace
 * (no-op when already a member). Never reveals whether a token existed for
 * non-members of anything else — a bad token is just "not found".
 */
export async function redeemWorkspaceInvite(
  userId: string,
  token: string,
): Promise<RedeemInviteResult> {
  const [invite] = await db
    .select({
      workspaceId: workspaceInvite.workspaceId,
      workspaceName: workspace.name,
    })
    .from(workspaceInvite)
    .innerJoin(workspace, eq(workspace.id, workspaceInvite.workspaceId))
    .where(eq(workspaceInvite.token, token))
    .limit(1);
  if (!invite) return { ok: false, error: "not_found" };

  const [existingMembership] = await requireMembershipId(userId, invite.workspaceId);
  if (existingMembership) {
    return {
      ok: true,
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspaceName,
      alreadyMember: true,
    };
  }

  await db
    .insert(workspaceMember)
    .values({
      workspaceId: invite.workspaceId,
      userId,
      role: "member",
    })
    .onConflictDoNothing();

  return {
    ok: true,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspaceName,
    alreadyMember: false,
  };
}
