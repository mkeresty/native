import { hasCollabSecret, getDocumentRoomState } from "@/lib/collaboration/server";

/**
 * Party → app room bootstrap (service-authenticated). Returns the stored
 * Markdown and binary Yjs state so a cold room can resume where the last
 * session left off. Markdown stays canonical; ydoc_state is an optimization.
 */
export async function GET(request: Request) {
  if (!hasCollabSecret(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const doc = await getDocumentRoomState(documentId);
  if (!doc) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({
    id: doc.id,
    title: doc.title,
    contentMd: doc.contentMd,
    ydocState: doc.ydocState,
  });
}
