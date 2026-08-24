import { auth } from "@/lib/auth/server";
import {
  createCollabTicket,
  TICKET_TTL_SECONDS,
} from "@/lib/collaboration/ticket";
import { getDocumentForUser } from "@/lib/documents/server";

/**
 * Exchanges a Better Auth session for a short-lived collaboration ticket
 * (see src/lib/collaboration/ticket.ts). The ticket is bound to one document
 * and one user, so a leaked ticket opens nothing else and expires quickly.
 */
export async function POST(request: Request) {
  const secret = process.env.COLLAB_API_SECRET;
  if (!secret) {
    return Response.json({ error: "collaboration_disabled" }, { status: 503 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let documentId: unknown;
  try {
    ({ documentId } = await request.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (typeof documentId !== "string" || documentId === "") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  // Membership check: only workspace members may open a room for the document.
  const doc = await getDocumentForUser(session.user.id, documentId);
  if (!doc) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const ticket = await createCollabTicket({
    doc: documentId,
    uid: session.user.id,
    name: session.user.name,
    secret,
    ttlSeconds: TICKET_TTL_SECONDS,
  });
  return Response.json({ ticket });
}
