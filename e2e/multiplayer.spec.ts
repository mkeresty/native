import { expect, test, type Page } from "@playwright/test";
import { test as pageErrorTest } from "./fixtures";

/**
 * Phase 4 gate (ARCHITECTURE.md): two browsers converge reliably.
 *
 * User A creates a document and writes; user B opens the same document, sees
 * A's text, writes back, and A sees it. Also asserts presence is exchanged.
 *
 * Skips (with a loud note) when the app under test was started without the
 * collaboration env — e.g. a reused dev server.
 */

async function signUp(page: Page, name: string): Promise<string> {
  await page.goto("/sign-up");
  // No name interpolation: display names contain spaces, emails must not.
  const email = `mp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.com`;
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret1");

  // On a cold dev server the first click can land before hydration; retry
  // until the navigation actually happens.
  const button = page.getByRole("button", { name: "Create account" });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await button.click();
    try {
      await page.waitForURL(/app$/, { timeout: 5_000 });
      return email;
    } catch {
      // not through yet — click again
    }
  }
  await page.waitForURL(/app$/);
  return email;
}

pageErrorTest("two users edit the same document concurrently", async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const probe = await await request.post("/api/collab/ticket", {
    data: { documentId: "probe" },
  });
  test.skip(
    probe.status() === 503,
    "Collaboration is not configured on the app under test",
  );
  expect(probe.status()).toBe(401); // enabled, and correctly rejecting anon

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await signUp(pageA, "Alice Writer");

  await pageA.getByRole("button", { name: "New document" }).first().click();
  await pageA.waitForURL(/\/app\/doc\//);
  const documentUrl = pageA.url();

  // Wait for A's live editor (collaboration sync must complete first).
  const editorA = pageA.locator(".tiptap-prose");
  await editorA.click();
  await editorA.type("# Shared notes");

  // A creates a join link via the real product flow (workspace menu).
  await pageA.getByRole("button", { name: "Switch workspace" }).click();
  await pageA
    .locator("[data-slot=dropdown-menu-content]")
    .getByRole("menuitem", { name: "Invite people" })
    .click();
  const inviteDialog = pageA.getByRole("dialog");
  await expect(
    inviteDialog.getByRole("heading", { name: /Invite to/ }),
  ).toBeVisible();
  const inviteLink = await inviteDialog
    .getByLabel("Invite link")
    .inputValue();
  expect(inviteLink).toContain("/app/join/");
  await pageA.keyboard.press("Escape");

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signUp(pageB, "Bob Writer");

  // B redeems the link and lands in A's workspace.
  await pageB.goto(inviteLink);
  await pageB.waitForURL(/app$/);

  // B opens A's document — membership grants access.
  await pageB.goto(documentUrl);

  // B sees A's text.
  const editorB = pageB.locator(".tiptap-prose");
  await expect(editorB).toContainText("Shared notes", { timeout: 20_000 });

  // B writes; A sees it.
  await editorB.click();
  await editorB.press("ControlOrMeta+End");
  await editorB.press("Enter");
  await editorB.type("Edited from B");
  await expect(editorA).toContainText("Edited from B", { timeout: 20_000 });

  // A writes below B; B sees it (convergence in both directions).
  await editorA.press("ControlOrMeta+End");
  await editorA.press("Enter");
  await editorA.type("Edited from A");
  await expect(editorB).toContainText("Edited from A", { timeout: 20_000 });

  // Presence: each side sees the other's avatar (title carries the name).
  await expect(pageA.getByTitle("Bob Writer")).toBeVisible();
  await expect(pageB.getByTitle("Alice Writer")).toBeVisible();

  await contextA.close();
  await contextB.close();
});
