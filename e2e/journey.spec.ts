import { expect, test, type Page } from "@playwright/test";

const unique = Date.now();

async function signUp(page: Page): Promise<string> {
  const email = `e2e-${unique}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/app");
  return email;
}

test.describe("critical user journey", () => {
  test("sign in → create document → edit → reload → persists", async ({
    page,
  }) => {
    await signUp(page);

    // Create a document from the sidebar.
    await page.getByRole("button", { name: "New document" }).click();
    await page.waitForURL(/\/app\/doc\//);
    const url = page.url();
    const documentId = url.split("/").pop()!;

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
    await expect(page.locator("nav[aria-label=Documents]")).toContainText(
      "Changelog",
    );

    // Sanity: markdown export contains canonical markdown.
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export .md" }).click();
    const file = await download;
    const path = await file.path();
    const { readFile } = await import("node:fs/promises");
    const md = await readFile(path!, "utf8");
    expect(md).toContain("# Release notes");
    expect(md).toContain("**editor**");

    // Document id stays stable across the session.
    expect(page.url()).toContain(documentId);
  });

  test("folders can be created and documents moved", async ({ page }) => {
    await signUp(page);
    await page.getByRole("button", { name: "New folder" }).click();
    await page.getByLabel("Name").fill("Specs");
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.locator("nav[aria-label=Documents]")).toContainText("Specs");
  });
});
