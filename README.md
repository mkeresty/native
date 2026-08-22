# Native

A collaborative Markdown workspace for developers — Google Docs for technical
knowledge, with Markdown as the underlying format.

> Early MVP. Phase 1 (foundation + authentication) is implemented; the editor,
> collaboration, and command palette land in subsequent phases.

## Stack

- **Next.js** (App Router) · React · strict TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives)
- **PostgreSQL** via **Drizzle ORM** (Neon-compatible)
- **Better Auth** — email/password, sessions stored in our own database
- **Bun** as package manager and script runner
- Deploy target: Vercel + Neon (see [DEPLOYMENT.md](./DEPLOYMENT.md))

See [ARCHITECTURE.md](./ARCHITECTURE.md) for decisions, tradeoffs, and the
roadmap.

## Getting started

Prerequisites: [Bun](https://bun.sh), Docker (or any local PostgreSQL).

```bash
bun install
cp .env.example .env.local   # then fill in the values (defaults below work)
docker compose up -d         # starts local Postgres on :5432
bun run db:migrate           # applies migrations from ./drizzle
bun run dev                  # http://localhost:3000
```

`.env.local` for local development:

```text
DATABASE_URL=postgres://postgres:postgres@localhost:5432/native
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<any long random string>
```

Sign up at `/sign-up` — a personal workspace is created automatically.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Dev server (Turbopack) |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Unit tests (vitest) |
| `bun run test:e2e` | Browser tests (Playwright, needs local DB) |
| `bun run db:generate` | Generate migration SQL from schema changes |
| `bun run db:migrate` | Apply migrations to `DATABASE_URL` |
| `bun run db:studio` | Drizzle Studio (browse data) |

More detail in [DEVELOPMENT.md](./DEVELOPMENT.md).

## Repository layout

```text
src/
  app/            # routes (landing, auth, /app shell)
  components/     # theme provider + shadcn/ui primitives
  db/             # drizzle client, schema, migrate script
  features/       # feature modules (auth forms, workspace shell)
  lib/            # auth config, workspace logic, utils
drizzle/          # versioned SQL migrations (do not edit by hand)
proxy.ts          # optimistic auth redirects (Next.js proxy)
```
