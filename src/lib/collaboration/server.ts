import { eq } from "drizzle-orm";

import { db } from "@/db";
import { document } from "@/db/schema";

/**
 * Service-facing helpers for the collaboration party (ARCHITECTURE.md
 * "Realtime / Collaboration Architecture"). The party is authenticated with a
 * shared secret, never with user sessions — it acts on behalf of the room.
 */

/** Room bootstrap state: what a cold party needs to resume a document. */
export async function getDocumentRoomState(documentId: string) {
  const [row] = await db
    .select({
      id: document.id,
      workspaceId: document.workspaceId,
      title: document.title,
      contentMd: document.contentMd,
      ydocState: document.ydocState,
    })
    .from(document)
    .where(eq(document.id, documentId))
    .limit(1);
  return row ?? null;
}

/**
 * Persists the collaborative snapshot. Markdown is written by client autosaves
 * (they own the serializer); the party writes the binary Yjs state so a cold
 * room resumes without replaying every update since the last client save.
 */
export async function saveCollabSnapshot(input: {
  documentId: string;
  contentMd?: string;
  ydocState?: string;
}) {
  const [row] = await db
    .select({ id: document.id })
    .from(document)
    .where(eq(document.id, input.documentId))
    .limit(1);
  if (!row) throw new Error("Document not found");

  await db
    .update(document)
    .set({
      ...(input.contentMd !== undefined ? { contentMd: input.contentMd } : {}),
      ...(input.ydocState !== undefined ? { ydocState: input.ydocState } : {}),
      updatedAt: new Date(),
    })
    .where(eq(document.id, input.documentId));
}

/** Shared-secret gate for the party → app service routes. */
export function hasCollabSecret(request: Request): boolean {
  const secret = process.env.COLLAB_API_SECRET;
  if (!secret) return false;
  return request.headers.get("x-collab-secret") === secret;
}
