/**
 * Realtime collaboration server (Phase 4).
 *
 * Hocuspocus — the standalone Yjs server maintained by Tiptap's team — replaced
 * the PartyKit party after two independent platform outages made their hosting
 * undeployable for new accounts (partykit.dev zone limit; free-plan SQLite DO
 * migrations). Everything else is unchanged:
 *
 * - Auth: browsers cannot send Editora's session cookies on a cross-origin
 *   WebSocket, so clients present a short-lived HMAC ticket (see
 *   src/lib/collaboration/ticket.ts) verified here per connection.
 * - Cold start: the document resumes from the last Yjs snapshot in Postgres
 *   via the app's service API.
 * - Persistence: Markdown stays canonical (client autosaves own the
 *   serializer); this server snapshots the binary Yjs state on a debounce so
 *   a cold start never replays long update histories.
 *
 * Run: bun server/collab.ts  (see DEPLOYMENT.md for hosting)
 */
import { Server } from "@hocuspocus/server";
import * as Y from "yjs";

import {
  verifyCollabTicket,
  type CollabTicketPayload,
} from "../src/lib/collaboration/ticket";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value !== "" ? value : undefined;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function requireEnv(name: string): Promise<string> {
  const value = env(name);
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

const server = new Server({
  port: Number(env("PORT") ?? 1999),
  quiet: true,
  // Snapshot cadence: soon after edits settle, at least every 15s while busy.
  debounce: 3_000,
  maxDebounce: 15_000,

  async onAuthenticate({ token, documentName }) {
    const secret = await requireEnv("COLLAB_API_SECRET");
    const payload: CollabTicketPayload | null = token
      ? await verifyCollabTicket(token, secret)
      : null;
    if (!payload || payload.doc !== documentName) {
      // Throwing rejects and closes the connection.
      throw new Error("unauthorized");
    }
    // Available as context in the other hooks if per-user logic is needed.
    return { uid: payload.uid, name: payload.name };
  },

  /** Cold-start resume: apply the last Yjs snapshot stored in Postgres. */
  async onLoadDocument({ document: ydoc, documentName }) {
    const appUrl = env("APP_URL");
    const secret = env("COLLAB_API_SECRET");
    if (!appUrl || !secret) return;

    try {
      const response = await fetch(
        `${appUrl}/api/collab/document?documentId=${documentName}`,
        { headers: { "x-collab-secret": secret } },
      );
      if (!response.ok) return;
      const state = (await response.json()) as { ydocState?: string | null };
      if (state.ydocState) {
        Y.applyUpdate(ydoc, base64ToBytes(state.ydocState));
      }
    } catch (error) {
      console.error("collab bootstrap failed:", error);
    }
  },

  /** Debounced durable backup of the binary Yjs state. */
  async onStoreDocument({ document: ydoc, documentName }) {
    const appUrl = env("APP_URL");
    const secret = env("COLLAB_API_SECRET");
    if (!appUrl || !secret) return;

    try {
      const response = await fetch(`${appUrl}/api/collab/save`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-collab-secret": secret,
        },
        body: JSON.stringify({
          documentId: documentName,
          ydocState: bytesToBase64(Y.encodeStateAsUpdate(ydoc)),
        }),
      });
      if (!response.ok) {
        console.error("collab snapshot save failed:", await response.text());
      }
    } catch (error) {
      console.error("collab snapshot save failed:", error);
    }
  },
});

void server.listen();
