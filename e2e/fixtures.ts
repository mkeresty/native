import { test as base, expect } from "@playwright/test";

/**
 * Fails any test whose page throws an uncaught runtime error
 * (e.g. missing provider context, hydration crashes).
 */
/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixtures use `use`, not React */
export const test = base.extend({
  page: async ({ page }, use) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      const message = error.message ?? String(error);
      // Browser wallet extensions inject scripts into every page; not our bugs.
      if (/chrome-extension:|StacksProvider/i.test(message)) return;
      pageErrors.push(message);
    });
    await use(page);
    expect(pageErrors, "uncaught page errors").toEqual([]);
  },
});

export { expect };
