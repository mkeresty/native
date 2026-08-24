/**
 * Short-lived, HMAC-signed tickets that authorize a WebSocket connection to a
 * collaboration room (TASK.md §12, ARCHITECTURE.md "Realtime").
 *
 * Browsers do not attach Native's session cookies to cross-origin WebSocket
 * upgrades (the PartyKit host is a different origin), so the client first
 * exchanges its session for a ticket bound to one document and one user, then
 * passes the ticket as a query parameter. The party verifies the signature and
 * expiry locally with Web Crypto — no database access needed in the worker.
 *
 * Uses only Web Crypto + base64url so the same code runs in the Next.js
 * server, tests, and the PartyKit (Cloudflare Workers) runtime.
 */

export type CollabTicketPayload = {
  /** Document (room) id the ticket is valid for. */
  doc: string;
  /** Native user id. */
  uid: string;
  /** Display name, used for presence/cursor labels. */
  name: string;
  /** Expiry, epoch seconds. */
  exp: number;
};

export const TICKET_TTL_SECONDS = 120;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function sign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  return new Uint8Array(signature);
}

/** Constant-time comparison over equal-length byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

export async function createCollabTicket(input: {
  doc: string;
  uid: string;
  name: string;
  secret: string;
  ttlSeconds?: number;
}): Promise<string> {
  const payload: CollabTicketPayload = {
    doc: input.doc,
    uid: input.uid,
    name: input.name,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? TICKET_TTL_SECONDS),
  };
  const body = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await sign(input.secret, body));
  return `${body}.${signature}`;
}

/** Returns the payload when the signature and expiry check out, else null. */
export async function verifyCollabTicket(
  token: string,
  secret: string,
): Promise<CollabTicketPayload | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  let provided: Uint8Array;
  try {
    provided = fromBase64Url(signature);
  } catch {
    return null;
  }
  const expected = await sign(secret, body);
  if (!timingSafeEqual(expected, provided)) return null;

  try {
    const payload = JSON.parse(
      textDecoder.decode(fromBase64Url(body)),
    ) as CollabTicketPayload;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.doc || !payload.uid) return null;
    return payload;
  } catch {
    return null;
  }
}
