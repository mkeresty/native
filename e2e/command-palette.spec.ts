import { expect, test, type Page } from "@playwright/test";
import { test as pageErrorTest } from "./fixtures";

/**
 * Presses a shortcut and retries until the app reacts. Right after navigation
 * the client bundle may still be hydrating, so the first keypress can land
 * before the global key listener exists — especially on slower CI machines.
 */
async function pressUntil(page: Page, combo: string, appears: () => void) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.keyboard.press(combo);
    try {
      await appears();
      return;
    } catch {
      // Not hydrated yet — try again after a beat.
      await page.waitForTimeout(250);
    }
  }
  // Final assertion for a clear failure message.
  await appears();
}

async function signUp(page: Page, name: string): Promise<void> {
  await page.goto("/sign-up");
  const email = `${name}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.com`;
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/app$/);
}

test.describe("command palette", () => {
  pageErrorTest("⌘K opens the palette and runs without page errors", async ({
    page,
  }) => {
    await signUp(page, "palette");

    const dialog = page.getByRole("dialog");
    await pressUntil(page, "ControlOrMeta+k", () =>
      expect(dialog).toBeVisible(),
    );
    await expect(
      dialog.getByPlaceholder("Type a command or search…"),
    ).toBeVisible();

    // Filtering works.
    await dialog.getByPlaceholder("Type a command or search…").fill("focus");
    await expect(
      dialog.getByRole("option", { name: /focus mode/i }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  pageErrorTest("⌘P quick-open lists documents", async ({ page }) => {
    await signUp(page, "quickopen");

    // Give the palette something to find.
    await page.getByRole("button", { name: "New document" }).first().click();
    await page.waitForURL(/\/app\/doc\//);
    const editor = page.locator(".tiptap-prose");
    await editor.click();
    await editor.fill("");
    await editor.type("# Palette bait");

    const dialog = page.getByRole("dialog");
    await pressUntil(page, "ControlOrMeta+p", () =>
      expect(dialog).toBeVisible(),
    );
    await expect(dialog.getByPlaceholder("Jump to document…")).toBeVisible();
  });

  pageErrorTest("⌘/ opens the shortcuts help screen", async ({ page }) => {
    await signUp(page, "help");

    const dialog = page.getByRole("dialog");
    await pressUntil(page, "ControlOrMeta+/", () =>
      expect(dialog).toBeVisible(),
    );
    await expect(
      dialog.getByRole("heading", { name: "Keyboard shortcuts" }),
    ).toBeVisible();
  });
});
