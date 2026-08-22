"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { getPrimaryWorkspaceId } from "@/lib/documents/server";
import {
  createDocument,
  createFolder,
  deleteDocumentForUser,
  deleteFolderForUser,
  duplicateDocument,
  moveDocumentToFolder,
  renameDocument,
  renameFolderForUser,
  saveDocumentContent,
} from "@/lib/documents/server";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session.user.id;
}

function revalidateApp() {
  revalidatePath("/app");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createDocumentAction(
  folderId: string | null = null,
): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const workspaceId = await getPrimaryWorkspaceId(userId);
    if (!workspaceId) return { ok: false, error: "No workspace found" };

    const created = await createDocument({ userId, workspaceId, folderId });
    revalidateApp();
    return { ok: true, documentId: created.id };
  } catch (error) {
    console.error("createDocumentAction failed:", error);
    return { ok: false, error: "Could not create the document" };
  }
}

export async function createFolderAction(name: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const workspaceId = await getPrimaryWorkspaceId(userId);
    if (!workspaceId) return { ok: false, error: "No workspace found" };
    await createFolder({ userId, workspaceId, name });
    revalidateApp();
    return { ok: true };
  } catch (error) {
    console.error("createFolderAction failed:", error);
    return { ok: false, error: "Could not create the folder" };
  }
}

export async function renameDocumentAction(
  documentId: string,
  title: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await renameDocument({ userId, documentId, title });
    revalidateApp();
    return { ok: true };
  } catch (error) {
    console.error("renameDocumentAction failed:", error);
    return { ok: false, error: "Could not rename the document" };
  }
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await deleteDocumentForUser(userId, documentId);
    revalidateApp();
    return { ok: true };
  } catch (error) {
    console.error("deleteDocumentAction failed:", error);
    return { ok: false, error: "Could not delete the document" };
  }
}

export async function duplicateDocumentAction(
  documentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await duplicateDocument(userId, documentId);
    revalidateApp();
    return { ok: true };
  } catch (error) {
    console.error("duplicateDocumentAction failed:", error);
    return { ok: false, error: "Could not duplicate the document" };
  }
}

export async function moveDocumentAction(
  documentId: string,
  folderId: string | null,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await moveDocumentToFolder({ userId, documentId, folderId });
    revalidateApp();
    return { ok: true };
  } catch (error) {
    console.error("moveDocumentAction failed:", error);
    return { ok: false, error: "Could not move the document" };
  }
}

export async function renameFolderAction(
  folderId: string,
  name: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await renameFolderForUser({ userId, folderId, name });
    revalidateApp();
    return { ok: true };
  } catch (error) {
    console.error("renameFolderAction failed:", error);
    return { ok: false, error: "Could not rename the folder" };
  }
}

export async function deleteFolderAction(folderId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await deleteFolderForUser(userId, folderId);
    revalidateApp();
    return { ok: true };
  } catch (error) {
    console.error("deleteFolderAction failed:", error);
    return { ok: false, error: "Could not delete the folder" };
  }
}

export async function saveDocumentAction(input: {
  documentId: string;
  title?: string;
  contentMd?: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await saveDocumentContent({
      userId,
      documentId: input.documentId,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.contentMd !== undefined && { contentMd: input.contentMd }),
    });
    return { ok: true };
  } catch (error) {
    console.error("saveDocumentAction failed:", error);
    return { ok: false, error: "Save failed" };
  }
}
