# Development

## Requirements

- Bun 1.4+
- Docker (or a local PostgreSQL 16+)

## Setup

```bash
bun install
cp .env.example .env.local
docker compose up -d
bun run db:migrate
bun run dev
```

The dev server runs on http://localhost:3000 with Turbopack.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `NEON_AUTH_BASE_URL` | yes | Branch-specific Neon Auth endpoint from the Neon console |
| `NEON_AUTH_COOKIE_SECRET` | yes | Signs cached session data. Generate: `openssl rand -base64 32` |

Secrets live only in `.env.local` (gitignored). `.env.example` is the tracked
template.

## Database

Schema lives in `src/db/schema.ts`. Neon Auth owns authentication data in the
`neon_auth` schema. The local `user` table is an application profile and maps
managed identities to stable workspace/document ownership.

Workflow:

```bash
# 1. Edit src/db/schema.ts
# 2. Generate versioned SQL
bun run db:generate
# 3. Review the file in ./drizzle, then apply locally
bun run db:migrate
```

Never edit applied migration files. To reset local data:

```bash
docker compose down -v && docker compose up -d && bun run db:migrate
```

## Authentication

Neon Auth with email/password and custom app-owned forms (`src/lib/auth`). Notes:

- Neon hosts the Better Auth server and its `neon_auth` schema; the app does not
  store passwords, sessions, or provider accounts.
- The API proxy is mounted at `/api/auth/[...path]`.
- Client helpers: `src/lib/auth/client.ts`; no Neon Auth UI components are used.
- Server-side session check: `const { data: session } = await getAuth().getSession()`.
- `proxy.ts` protects `/app` and refreshes the signed Neon session cache.
- A personal workspace is provisioned on the first authenticated `/app` request.

## Conventions

- Strict TypeScript; no non-null assertions in app code where avoidable.
- shadcn/ui components are source-owned under `src/components/ui`; style them
  through variants and semantic tokens, not ad-hoc colors.
- All colors must reference design tokens (`bg-background`, `text-muted-foreground`,
  `bg-editor-background`, …). Raw palette classes (`bg-blue-500`) are not allowed.
- Feature logic goes in `src/features/*`, not in page components.
- Icons: lucide-react; inside buttons use `data-icon="inline-start|end"` and no
  manual sizing classes.
- Forms use `FieldGroup`/`Field` primitives.

## Verification checklist (run before pushing)

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:e2e   # requires the dev database; starts its own server on :3100
```

### Testing

- **Unit** (`src/**/*.test.ts`, vitest): markdown serialization round-trips,
  pure helpers. No database required.
- **E2E** (`e2e/*.spec.ts`, Playwright): the critical journey — sign up,
  create document, edit, autosave, reload, persistence, folders, export.
  Needs a migrated database reachable via `DATABASE_URL`; Playwright boots the
  app on port 3100 itself.
