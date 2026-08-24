import { expect, test, type Page } from "@playwright/test";
import { test as pageErrorTest } from "./fixtures";

const unique = Date.now();

async function signUp(page: Page): Promise<string> {
  const email = `e2e-${unique}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/app$/);
  return email;
}

const sidebar = (page: Page) => page.locator('[data-slot="sidebar"]');

test.describe("critical user journey", () => {
  pageErrorTest("app shell has no uncaught runtime errors", async ({ page }) => {
    await signUp(page);
    // Interact with the menus that previously threw MenuGroupContext errors.
    // Menus mount asynchronously, so every step asserts on the live popup.
    const accountTrigger = page.getByRole("button", { name: /Account:/ });
    const accountMenu = page.getByRole("menu", { name: /Account:/ });

    await accountTrigger.click();
    const menuEmail = page
      .locator("[data-slot=dropdown-menu-content]")
      .filter({ hasText: /@example\.com/ });
    await expect(menuEmail).toBeVisible();

    await accountTrigger.click();
    await expect(accountMenu).toBeHidden();

    const workspaceMenu = page
      .locator("[data-slot=dropdown-menu-content]")
      .filter({ hasText: "Workspaces" });
    await page.getByRole("button", { name: "Switch workspace" }).click();
    await expect(workspaceMenu).toBeVisible();
    await expect(workspaceMenu).toContainText("Current");
  });

  test("sign in → create document → edit → reload → persists", async ({
    page,
  }) => {
    await signUp(page);

    // Create a document from the sidebar.
    await page.getByRole("button", { name: "New document" }).first().click();
    await page.waitForURL(/\/app\/doc\//);
    const documentId = page.url().split("/").pop()!;

    // Type into the editor using markdown input rules.
    const editor = page.locator(".tiptap-prose");
    await editor.click();
    await editor.type("# Release notes");
    await page.keyboard.press("Enter");
    await editor.type("Shipped the **editor**.");
    await page.keyboard.press("Enter");

    // Wait for the debounced autosave to reach "Saved".
    await expect(page.getByText(/Saved \d/)).toBeVisible({ timeout: 10_000 });

    // Reload — content must persist.
    await page.reload();
    await expect(page.getByLabel("Document title")).toHaveValue("Untitled");
    await expect(editor.locator("h1")).toHaveText("Release notes");
    await expect(editor.locator("strong")).toHaveText("editor");

    // Title rename propagates to the sidebar after save + refresh.
    await page.getByLabel("Document title").fill("Changelog");
    await expect(page.getByText(/Saved \d/)).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(sidebar(page)).toContainText("Changelog");

    // Markdown source view shows and edits the canonical document.
    await page.getByRole("button", { name: "Markdown source" }).click();
    const source = page.getByLabel("Document markdown source");
    await expect(source).toHaveValue(/# Release notes/);
    await source.fill("# Renamed heading\n\nStill **bold**.\n");
    await expect(page.getByText(/Saved \d/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Markdown source" }).click();
    await expect(editor.locator("h1")).toHaveText("Renamed heading");

    // Sanity: markdown export contains canonical markdown.
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export .md" }).click();
    const file = await download;
    const path = await file.path();
    const { readFile } = await import("node:fs/promises");
    const md = await readFile(path!, "utf8");
    expect(md).toContain("# Renamed heading");
    expect(md).toContain("**bold**");

    // Document id stays stable across the session.
    expect(page.url()).toContain(documentId);
  });

  test("collections can be created and documents moved", async ({ page }) => {
    await signUp(page);
    await page.getByRole("button", { name: "New collection" }).click();
    await page.getByLabel("Name").fill("Specs");
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(sidebar(page)).toContainText("Specs");

    // Move the flow: create a doc and file it under the collection.
    await page.getByRole("button", { name: "New document" }).first().click();
    await page.waitForURL(/\/app\/doc\//);
    await page.getByLabel("Document title").fill("Filed doc");
    await expect(page.getByText(/Saved \d/)).toBeVisible({ timeout: 10_000 });
    await page.reload();

    await page
      .getByRole("button", { name: "Actions for Filed doc" })
      .click({ force: true });
    await page
      .locator("[data-slot=dropdown-menu-content]")
      .getByRole("menuitem", { name: "Move to collection" })
      .click();
    const specsFolder = sidebar(page).getByRole("button", {
      name: "Specs",
      exact: true,
    });
    await expect(specsFolder).toBeVisible();
    await specsFolder.click();
    await expect(sidebar(page)).toContainText("Filed doc");
  });

  test("documents can be deleted from the sidebar", async ({ page }) => {
    await signUp(page);
    await page.getByRole("button", { name: "New document" }).first().click();
    await page.waitForURL(/\/app\/doc\//);
    await page.getByLabel("Document title").fill("Doomed doc");
    await expect(page.getByText(/Saved \d/)).toBeVisible({ timeout: 10_000 });

    // Sync the sidebar tree with the saved title.
    await page.reload();

    const itemMenu = page.getByRole("button", { name: "Actions for Doomed doc" });
    const menuContent = page.locator("[data-slot=dropdown-menu-content]");
    const deleteItem = menuContent.getByRole("menuitem", {
      name: "Delete document",
    });
    // action button reveals on hover; on a slow runner the click can land
    // before the dropdown handler hydrates, so retry until the menu opens.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await itemMenu.click({ force: true });
      try {
        await deleteItem.waitFor({ state: "visible", timeout: 2_000 });
        break;
      } catch {
        // menu never opened — click again
      }
    }
    await deleteItem.click();

    // Navigates home; the document disappears from the tree.
    await page.waitForURL(/\/app$/);
    await expect(sidebar(page)).not.toContainText("Doomed doc");
  });

  pageErrorTest(
    "sidebar collapses to an icon rail that stays usable",
    async ({ page }) => {
      await signUp(page);

      await page.getByRole("button", { name: /Toggle sidebar/ }).click();
      const collapsedSidebar = sidebar(page);
      await expect(collapsedSidebar).toHaveAttribute("data-state", "collapsed");
      // Controls remain visible as icons.
      await expect(
        collapsedSidebar.getByRole("button", { name: "Switch workspace" }),
      ).toBeVisible();
      await expect(
        collapsedSidebar.getByRole("button", { name: /Account:/ }),
      ).toBeVisible();

      // Re-expand via the rail trigger.
      await page.getByRole("button", { name: /Toggle sidebar/ }).click();
      await expect(
        collapsedSidebar.getByRole("button", { name: "New document" }).first(),
      ).toBeVisible();
    },
  );
});
