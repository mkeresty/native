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
| `BETTER_AUTH_SECRET` | yes | Signs auth session tokens. Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | recommended | Canonical base URL; used for cookies/redirects |

Secrets live only in `.env.local` (gitignored). `.env.example` is the tracked
template.

## Database

Schema lives in `src/db/schema.ts`. Auth tables (`user`, `session`, `account`,
`verification`) are owned by Better Auth — change them only via its options,
never by renaming columns.

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

Better Auth with email/password (`src/lib/auth/server.ts`). Notes:

- On signup, a database hook creates a personal workspace + owner membership.
- Sessions are stored in our own Postgres (table `session`).
- The API is mounted at `/api/auth/[...all]`.
- Client helpers: `src/lib/auth/client.ts`.
- Server-side session check: `auth.api.getSession({ headers: await headers() })`.
- `proxy.ts` performs optimistic cookie-presence redirects only; every protected
  page revalidates the session server-side.

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
bun run build
```
