import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const COLLAB_SECRET = "e2e-collab-secret";
const COLLAB_HOST = "127.0.0.1:1999";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  // Two browsers (the multiplayer gate needs exactly two) against a compiling
  // dev server + party runtime; more workers starve the machine and flake.
  workers: 2,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_EXTERNAL_SERVER
    ? undefined
    : [
        // The collaboration party must be up before the app: the dev server
        // inlines NEXT_PUBLIC_COLLAB_HOST and clients connect on first load.
        {
          command: `bunx partykit dev --port 1999 --var "APP_URL=http://localhost:${PORT}" --var "COLLAB_API_SECRET=${COLLAB_SECRET}"`,
          url: `http://127.0.0.1:1999/parties/main/health`,
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: `bun run dev --port ${PORT}`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: true,
          timeout: 30_000,
          env: {
            NEXT_PUBLIC_COLLAB_HOST: COLLAB_HOST,
            COLLAB_API_SECRET: COLLAB_SECRET,
          },
        },
      ],
});
