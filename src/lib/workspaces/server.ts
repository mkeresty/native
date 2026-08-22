import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { db } from "@/db";
import type * as schema from "@/db/schema";
import { workspace, workspaceMember } from "@/db/schema";
import { slugify } from "@/lib/utils/slugify";

type Database = PostgresJsDatabase<typeof schema>;

export async function createDefaultWorkspace(
  database: Database,
  userId: string,
  userName: string,
) {
  const baseName = `${userName.split(" ")[0] || "My"}'s Workspace`;
  const slug = await uniqueSlug(database, slugify(baseName));

  const [created] = await database
    .insert(workspace)
    .values({ name: baseName, slug, createdBy: userId })
    .returning();

  await database
    .insert(workspaceMember)
    .values({ workspaceId: created.id, userId, role: "owner" });

  return created;
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

async function uniqueSlug(database: Database, base: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`;
    const [existing] = await database
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
