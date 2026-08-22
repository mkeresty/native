import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { document, folder, user, workspaceMember } from "@/db/schema";

export type DocumentSummary = {
  id: string;
  title: string;
  folderId: string | null;
  updatedAt: Date;
};

export type FolderSummary = {
  id: string;
  name: string;
};

/** Throws when the user is not a member of the document's workspace. */
async function requireMembership(userId: string, workspaceId: string) {
  const [member] = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(eq(workspaceMember.userId, userId), eq(workspaceMember.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!member) throw new Error("Not a member of this workspace");
}

export async function getPrimaryWorkspaceId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(eq(workspaceMember.userId, userId))
    .orderBy(asc(workspaceMember.createdAt))
    .limit(1);
  return row?.workspaceId ?? null;
}

export async function listWorkspaceTree(userId: string, workspaceId: string) {
  await requireMembership(userId, workspaceId);

  const folders = (await db
    .select({ id: folder.id, name: folder.name })
    .from(folder)
    .where(eq(folder.workspaceId, workspaceId))
    .orderBy(asc(folder.position), asc(folder.createdAt))) satisfies FolderSummary[];

  const documents: DocumentSummary[] = await db
    .select({
      id: document.id,
      title: document.title,
      folderId: document.folderId,
      updatedAt: document.updatedAt,
    })
    .from(document)
    .where(and(eq(document.workspaceId, workspaceId)))
    .orderBy(desc(document.updatedAt));

  return { folders, documents };
}

export async function listRecentDocuments(userId: string, limit = 5) {
  return db
    .select({
      id: document.id,
      title: document.title,
      updatedAt: document.updatedAt,
    })
    .from(document)
    .innerJoin(
      workspaceMember,
      and(
        eq(workspaceMember.workspaceId, document.workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .orderBy(desc(document.updatedAt))
    .limit(limit);
}

export async function createDocument(input: {
  userId: string;
  workspaceId: string;
  folderId?: string | null;
  title?: string;
}) {
  await requireMembership(input.userId, input.workspaceId);

  const [created] = await db
    .insert(document)
    .values({
      workspaceId: input.workspaceId,
      folderId: input.folderId ?? null,
      title: input.title?.trim() || "Untitled",
      contentMd: "",
      createdBy: input.userId,
      updatedBy: input.userId,
    })
    .returning();
  return created;
}

export async function createFolder(input: {
  userId: string;
  workspaceId: string;
  name: string;
}) {
  await requireMembership(input.userId, input.workspaceId);
  const name = input.name.trim() || "New folder";
  const [created] = await db
    .insert(folder)
    .values({ workspaceId: input.workspaceId, name, createdBy: input.userId })
    .returning();
  return created;
}

export async function renameDocument(input: {
  userId: string;
  documentId: string;
  title: string;
}) {
  await getDocumentForUser(input.userId, input.documentId);
  await db
    .update(document)
    .set({ title: input.title.trim() || "Untitled", updatedBy: input.userId })
    .where(eq(document.id, input.documentId));
}

export async function deleteDocumentForUser(userId: string, documentId: string) {
  const doc = await getDocumentForUser(userId, documentId);
  await db.delete(document).where(eq(document.id, documentId));
  return doc;
}

export async function duplicateDocument(userId: string, documentId: string) {
  const doc = await getDocumentForUser(userId, documentId);
  const [created] = await db
    .insert(document)
    .values({
      workspaceId: doc.workspaceId,
      folderId: doc.folderId,
      title: `${doc.title} copy`,
      contentMd: doc.contentMd,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();
  return created;
}

export async function moveDocumentToFolder(input: {
  userId: string;
  documentId: string;
  folderId: string | null;
}) {
  await getDocumentForUser(input.userId, input.documentId);
  await db
    .update(document)
    .set({ folderId: input.folderId, updatedBy: input.userId })
    .where(eq(document.id, input.documentId));
}

export async function renameFolderForUser(input: {
  userId: string;
  folderId: string;
  name: string;
}) {
  await getFolderForUser(input.userId, input.folderId);
  await db
    .update(folder)
    .set({ name: input.name.trim() || "Untitled folder" })
    .where(eq(folder.id, input.folderId));
}

export async function deleteFolderForUser(userId: string, folderId: string) {
  // Documents inside fall back to the workspace root (folder_id set null).
  await getFolderForUser(userId, folderId);
  await db.delete(folder).where(eq(folder.id, folderId));
}

async function getFolderForUser(userId: string, folderId: string) {
  const [row] = await db
    .select({ id: folder.id, workspaceId: folder.workspaceId })
    .from(folder)
    .innerJoin(
      workspaceMember,
      and(
        eq(workspaceMember.workspaceId, folder.workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .where(eq(folder.id, folderId))
    .limit(1);
  if (!row) throw new Error("Folder not found");
  return row;
}

export async function getDocumentForUser(userId: string, documentId: string) {
  const [row] = await db
    .select({
      id: document.id,
      title: document.title,
      contentMd: document.contentMd,
      workspaceId: document.workspaceId,
      folderId: document.folderId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      folderName: folder.name,
      authorName: user.name,
    })
    .from(document)
    .leftJoin(folder, eq(document.folderId, folder.id))
    .innerJoin(user, eq(document.createdBy, user.id))
    .innerJoin(
      workspaceMember,
      and(
        eq(workspaceMember.workspaceId, document.workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .where(eq(document.id, documentId))
    .limit(1);
  return row ?? null;
}

export async function saveDocumentContent(input: {
  userId: string;
  documentId: string;
  title?: string;
  contentMd?: string;
}) {
  await getDocumentForUser(input.userId, input.documentId);
  await db
    .update(document)
    .set({
      ...(input.title !== undefined
        ? { title: input.title.trim() || "Untitled" }
        : {}),
      ...(input.contentMd !== undefined ? { contentMd: input.contentMd } : {}),
      updatedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(eq(document.id, input.documentId));
}
