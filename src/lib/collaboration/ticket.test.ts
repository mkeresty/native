import { describe, expect, it } from "vitest";

import {
  createCollabTicket,
  TICKET_TTL_SECONDS,
  verifyCollabTicket,
} from "./ticket";

const SECRET = "test-secret-for-collab-tickets";

describe("collab tickets", () => {
  it("round-trips a valid ticket", async () => {
    const token = await createCollabTicket({
      doc: "doc-1",
      uid: "user-1",
      name: "Mason",
      secret: SECRET,
    });
    const payload = await verifyCollabTicket(token, SECRET);
    expect(payload).toMatchObject({ doc: "doc-1", uid: "user-1", name: "Mason" });
  });

  it("defaults the expiry to the TTL window", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createCollabTicket({
      doc: "doc-1",
      uid: "user-1",
      name: "Mason",
      secret: SECRET,
    });
    const payload = await verifyCollabTicket(token, SECRET);
    expect(payload?.exp).toBeGreaterThanOrEqual(before + TICKET_TTL_SECONDS - 1);
  });

  it("rejects a ticket signed with a different secret", async () => {
    const token = await createCollabTicket({
      doc: "doc-1",
      uid: "user-1",
      name: "Mason",
      secret: "another-secret",
    });
    expect(await verifyCollabTicket(token, SECRET)).toBeNull();
  });

  it("rejects tampered payloads", async () => {
    const token = await createCollabTicket({
      doc: "doc-1",
      uid: "user-1",
      name: "Mason",
      secret: SECRET,
    });
    const [body, signature] = token.split(".");
    // Flip the document id inside the payload while keeping the signature.
    const forged = `${body}x.${signature}`;
    expect(await verifyCollabTicket(forged, SECRET)).toBeNull();
  });

  it("rejects expired tickets", async () => {
    const token = await createCollabTicket({
      doc: "doc-1",
      uid: "user-1",
      name: "Mason",
      secret: SECRET,
      ttlSeconds: -10,
    });
    expect(await verifyCollabTicket(token, SECRET)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    expect(await verifyCollabTicket("", SECRET)).toBeNull();
    expect(await verifyCollabTicket("not-a-ticket", SECRET)).toBeNull();
    expect(await verifyCollabTicket("a.b.c", SECRET)).toBeNull();
  });
});
