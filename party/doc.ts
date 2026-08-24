import * as Y from "yjs";
import { onConnect as yOnConnect, type YPartyKitOptions } from "y-partykit";
import type * as Party from "partykit/server";

import { verifyCollabTicket } from "../src/lib/collaboration/ticket";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * One party per open document: the room id is the Native document id.
 *
 * Auth: browsers cannot send Native's session cookies on a cross-origin
 * WebSocket upgrade, so clients present a short-lived HMAC ticket (see
 * src/lib/collaboration/ticket.ts) that is verified here without database
 * access.
 *
 * State: PartyKit room storage holds the live Yjs state (survives
 * hibernation). On a cold start, `load` pulls the last snapshot from Postgres
 * through the app's service API — the two sources merge as CRDT updates.
 *
 * Persistence: Markdown stays canonical and is written by client autosaves.
 * This party additionally snapshots the binary Yjs state to Postgres on a
 * debounced cadence so a cold room never replays long update histories.
 */
export default class DocServer implements Party.Server {
  // `options` is reserved by PartyKit's Server base type.
  readonly yOptions: YPartyKitOptions;

  constructor(readonly room: Party.Room) {
    this.yOptions = {
      persist: { mode: "snapshot" },
      callback: {
        debounceWait: 3_000,
        timeout: 30_000,
        handler: async (doc) => {
          await this.persistSnapshot(doc);
        },
      },
      load: async () => this.loadFromPostgres(),
    };
  }

  /** Health endpoint so orchestrators (and Playwright) can probe the room. */
  onRequest(): Response {
    return Response.json({ ok: true, room: this.room.id });
  }

  async onConnect(
    connection: Party.Connection,
    ctx: Party.ConnectionContext,
  ): Promise<void> {
    const secret = this.env("COLLAB_API_SECRET");
    const ticket = new URL(ctx.request.url).searchParams.get("t") ?? "";
    const payload = secret
      ? await verifyCollabTicket(ticket, secret)
      : null;

    if (!payload || payload.doc !== this.room.id) {
      connection.close(4403, "unauthorized");
      return;
    }

    // Kept for future per-connection attribution (e.g. presence bookkeeping).
    connection.setState({ uid: payload.uid, name: payload.name });

    await yOnConnect(connection, this.room, this.yOptions);
  }

  private env(name: string): string | undefined {
    // Workers have no Node `process`; configuration arrives via room env
    // (partykit.json `env` in dev, `partykit env` in production).
    const value = (this.room.env as Record<string, unknown> | undefined)?.[name];
    return typeof value === "string" ? value : undefined;
  }

  /** Cold-start resume: apply the last Yjs snapshot stored in Postgres. */
  private async loadFromPostgres(): Promise<Y.Doc | null> {
    const appUrl = this.env("APP_URL");
    const secret = this.env("COLLAB_API_SECRET");
    if (!appUrl || !secret) return null;

    try {
      const response = await fetch(
        `${appUrl}/api/collab/document?documentId=${this.room.id}`,
        { headers: { "x-collab-secret": secret } },
      );
      if (!response.ok) return null;
      const state = (await response.json()) as { ydocState?: string | null };
      if (!state.ydocState) return null;

      const doc = new Y.Doc();
      Y.applyUpdate(doc, base64ToBytes(state.ydocState));
      return doc;
    } catch (error) {
      console.error("collab bootstrap failed:", error);
      return null;
    }
  }

  /** Debounced durable backup of the binary Yjs state. */
  private async persistSnapshot(doc: Y.Doc): Promise<void> {
    const appUrl = this.env("APP_URL");
    const secret = this.env("COLLAB_API_SECRET");
    if (!appUrl || !secret) return;

    try {
      const response = await fetch(`${appUrl}/api/collab/save`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-collab-secret": secret,
        },
        body: JSON.stringify({
          documentId: this.room.id,
          ydocState: bytesToBase64(Y.encodeStateAsUpdate(doc)),
        }),
      });
      if (!response.ok) {
        console.error("collab snapshot save failed:", await response.text());
      }
    } catch (error) {
      console.error("collab snapshot save failed:", error);
    }
  }
}
