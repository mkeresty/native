import { hasCollabSecret, saveCollabSnapshot } from "@/lib/collaboration/server";

/**
 * Party → app snapshot persistence (service-authenticated). The party sends
 * the binary Yjs state on its own cadence; clients send canonical Markdown
 * through saveDocumentAction. Both serialize from the same Yjs doc, so the
 * columns converge.
 */
export async function POST(request: Request) {
  if (!hasCollabSecret(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    documentId?: unknown;
    contentMd?: unknown;
    ydocState?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { documentId, contentMd, ydocState } = body;
  if (typeof documentId !== "string" || documentId === "") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (contentMd !== undefined && typeof contentMd !== "string") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (ydocState !== undefined && typeof ydocState !== "string") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    await saveCollabSnapshot({
      documentId,
      ...(contentMd !== undefined && { contentMd }),
      ...(ydocState !== undefined && { ydocState }),
    });
  } catch (error) {
    console.error("collab save failed:", error);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
