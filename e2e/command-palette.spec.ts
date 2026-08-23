import { expect, test } from "@playwright/test";
import { test as pageErrorTest } from "./fixtures";

test.describe("command palette", () => {
  pageErrorTest("⌘K opens the palette and runs without page errors", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    const email = `palette-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.com`;
    await page.getByLabel("Name").fill("Palette Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("supersecret1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/app$/);

    await page.keyboard.press("ControlOrMeta+k");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByPlaceholder("Type a command or search…"),
    ).toBeVisible();

    // Filtering works.
    await dialog.getByPlaceholder("Type a command or search…").fill("focus");
    await expect(dialog.getByRole("option", { name: /focus mode/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  pageErrorTest("⌘P quick-open lists documents", async ({ page }) => {
    await page.goto("/sign-up");
    const email = `quickopen-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.com`;
    await page.getByLabel("Name").fill("Quick Open Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("supersecret1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/app$/);

    // Give the palette something to find.
    await page.getByRole("button", { name: "New document" }).first().click();
    await page.waitForURL(/\/app\/doc\//);
    const editor = page.locator(".tiptap-prose");
    await editor.click();
    await editor.fill("");
    await editor.type("# Palette bait");

    await page.keyboard.press("ControlOrMeta+p");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByPlaceholder("Jump to document…"),
    ).toBeVisible();
  });

  pageErrorTest("⌘/ opens the shortcuts help screen", async ({ page }) => {
    await page.goto("/sign-up");
    const email = `help-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.com`;
    await page.getByLabel("Name").fill("Help Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("supersecret1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/app$/);

    await page.keyboard.press("ControlOrMeta+/");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Keyboard shortcuts" }),
    ).toBeVisible();
  });
});
