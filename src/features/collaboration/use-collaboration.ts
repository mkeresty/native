"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import YPartyKitProvider from "y-partykit/provider";

import { presenceColor } from "@/features/collaboration/presence";

/**
 * Client half of the collaboration layer (ARCHITECTURE.md "Interfaces"):
 * owns the Yjs doc, the PartyKit connection, and presence. The editor only
 * consumes the session object — swapping the realtime provider later means
 * changing this file, not the editor.
 *
 * When NEXT_PUBLIC_COLLAB_HOST is unset the session is "disabled" and the
 * editor behaves exactly as it did before Phase 4 (solo mode).
 */

export type CollabStatus = "disabled" | "connecting" | "live" | "offline";

export type CollabPeer = {
  clientId: number;
  id: string;
  name: string;
  color: string;
  isSelf: boolean;
};

export type Collaboration = {
  enabled: boolean;
  /**
   * True once the initial Yjs sync has completed — the fragment now reflects
   * the stored document, so it is safe to bind (and seed) the editor.
   */
  ready: boolean;
  status: CollabStatus;
  ydoc: Y.Doc | null;
  provider: YPartyKitProvider | null;
  peers: CollabPeer[];
};

const HOST = process.env.NEXT_PUBLIC_COLLAB_HOST;
// Party name derives from partykit.json's `main` entry point (party/doc.ts
// is served as the project's single "main" party).
const PARTY = "main";
/** Reuse a ticket for half its TTL; a fresh one rides every reconnect. */
const TICKET_REUSE_MS = 60_000;
const PROVIDER_RETRIES = 5;
const PROVIDER_RETRY_MS = 1_500;

export function useCollaboration(input: {
  documentId: string;
  user: { id: string; name: string };
}): Collaboration {
  const { documentId, user } = input;
  const enabled = Boolean(HOST);

  const ydoc = useMemo(() => (enabled ? new Y.Doc() : null), [enabled]);
  const [provider, setProvider] = useState<YPartyKitProvider | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<CollabStatus>(
    enabled ? "connecting" : "disabled",
  );
  const [peers, setPeers] = useState<CollabPeer[]>([]);

  // Latest user identity without re-running the connection effect on rerenders.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!HOST || !ydoc) return;
    const doc = ydoc;

    let disposed = false;
    let active: YPartyKitProvider | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const ticket = { value: null as string | null, at: 0 };
    async function getTicket(): Promise<string> {
      if (ticket.value && Date.now() - ticket.at < TICKET_REUSE_MS) {
        return ticket.value;
      }
      const response = await fetch("/api/collab/ticket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!response.ok) throw new Error("ticket request failed");
      const data = (await response.json()) as { ticket: string };
      ticket.value = data.ticket;
      ticket.at = Date.now();
      return data.ticket;
    }

    function attach(instance: YPartyKitProvider) {
      instance.on("status", ({ status: wsStatus }: { status: string }) => {
        if (disposed) return;
        setStatus(
          wsStatus === "connected"
            ? "live"
            : wsStatus === "connecting"
              ? "connecting"
              : "offline",
        );
      });
      instance.on("synced", () => {
        if (!disposed) setReady(true);
      });

      const self = userRef.current;
      instance.awareness.setLocalStateField("user", {
        id: self.id,
        name: self.name,
        color: presenceColor(self.id),
      });
      const refreshPeers = () => {
        if (disposed) return;
        const next: CollabPeer[] = [];
        for (const [clientId, state] of instance.awareness.getStates()) {
          const peer = (state as { user?: { id: string; name: string; color: string } })
            .user;
          if (!peer) continue;
          next.push({
            clientId,
            id: peer.id,
            name: peer.name,
            color: peer.color,
            isSelf: peer.id === self.id,
          });
        }
        setPeers(next);
      };
      instance.awareness.on("change", refreshPeers);
      refreshPeers();
    }

    function connect(attempt = 0) {
      if (disposed) return;
      try {
        const instance = new YPartyKitProvider(HOST!, documentId, doc, {
          party: PARTY,
          // Re-resolved on every (re)connect, so tickets never go stale.
          params: async () => ({ t: await getTicket() }),
          // The room lives on another origin; BroadcastChannel would only
          // reach tabs of the app origin and duplicate updates.
          disableBc: true,
        });
        active = instance;
        attach(instance);
        setProvider(instance);
      } catch {
        // Most commonly the ticket fetch failing while offline. The provider
        // cannot retry on its own until it opens once, so recreate instead.
        if (attempt < PROVIDER_RETRIES) {
          retryTimer = setTimeout(() => connect(attempt + 1), PROVIDER_RETRY_MS);
        } else {
          setStatus("offline");
        }
      }
    }

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      active?.destroy();
      setProvider(null);
      setReady(false);
      setPeers([]);
    };
  }, [documentId, ydoc]);

  return { enabled, ready, status, ydoc, provider, peers };
}
