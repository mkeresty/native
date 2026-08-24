# Deployment

Target: **Vercel** (app) + **Neon** (Postgres) + **PartyKit** (realtime). Total cost at MVP scale: ~$0.

## Environments

| Environment | Where | Database |
| --- | --- | --- |
| Local | `bun run dev` | Docker Postgres (`docker-compose.yml`) |
| Preview | Vercel per-PR deployment | Neon branch (optional but recommended) |
| Production | Vercel `main` branch | Neon production database |

## First-time setup

1. **Neon**: create a project → copy the pooled connection string.
2. **Vercel**: import the repository; framework preset Next.js, build command
   `bun run build` (or default).
3. Set environment variables in Vercel:

   | Variable | Production | Preview |
   | --- | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string | Neon **branch** connection string |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | same or separate |
   | `BETTER_AUTH_URL` | `https://your-production-domain` | **leave unset** |
   | `RUN_MIGRATIONS_ON_PREVIEW` | — | `1`, only if Preview has its own branch |

   `BETTER_AUTH_URL` is deliberately production-only. Preview deployments get a
   generated hostname, so a single fixed value would point auth callbacks and
   cookies at the wrong origin; previews resolve their own origin from
   `VERCEL_URL` instead (`src/lib/auth/base-url.ts`).

4. Apply migrations to production once, before the first deploy:

   ```bash
   DATABASE_URL="<neon prod url>" bun run db:migrate
   ```

   Subsequent migrations are applied automatically — see below.

## Realtime collaboration (PartyKit)

The app deploys and runs without it — with `NEXT_PUBLIC_COLLAB_HOST` unset the
editor works in solo mode. Realtime is a separate deployment:

1. **Account**: `bunx partykit login` (free tier).
2. **Deploy the party**: `bunx partykit deploy` (config: `partykit.json`,
   server: `party/doc.ts` — one room per document).
3. **Party env** (production):

   ```bash
   partykit env add APP_URL=https://your-production-domain --production
   partykit env add COLLAB_API_SECRET="<openssl rand -base64 32>" --production
   ```

4. **Vercel env** (Production):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_COLLAB_HOST` | `<project>.<user>.partykit.dev` |
   | `COLLAB_API_SECRET` | same value as the party's |

   Redeploy the app after adding the variables — `NEXT_PUBLIC_*` is inlined at
   build time.

`COLLAB_API_SECRET` authenticates the service calls in both directions: the
app signs room tickets with it, and the party presents it when it reads room
bootstrap state or writes Yjs snapshots (`/api/collab/*`). Rotating it
requires updating both sides; existing room tickets expire within two minutes.

Local development: `bunx partykit dev --var "APP_URL=http://localhost:3000"`
alongside `bun run dev`, with `NEXT_PUBLIC_COLLAB_HOST=127.0.0.1:1999` and a
matching `COLLAB_API_SECRET` in `.env.local`. The E2E suite starts both
servers itself (see `playwright.config.ts`).

## CI/CD

`.github/workflows/ci.yml` runs on every PR and push to `main`:

```text
install (bun, frozen lockfile)
  → generate route types (next typegen)
  → typecheck (tsc --noEmit)
  → lint (eslint)
  → unit tests (vitest)
  → build (next build)

e2e job: Postgres service + migrations + Playwright (partykit dev + next dev)
```

Rules of the pipeline:

- PRs get a Vercel preview deployment automatically (Vercel GitHub integration).
- Merge to `main` only when CI is green; Vercel deploys `main` to production.

### Migrations on deploy

Deploys are automatic, so migrations are too — otherwise merging a PR that adds
a migration ships code expecting a column that does not exist yet.

The `vercel-build` script runs `scripts/deploy-migrate.ts` before `next build`.
Vercel only shifts traffic once the build succeeds, so a failed migration aborts
the deployment rather than serving code against an unmigrated schema.

| Environment | Migrates? |
| --- | --- |
| Production (`VERCEL_ENV=production`) | yes |
| Preview | only with `RUN_MIGRATIONS_ON_PREVIEW=1` |
| Local `bun run build`, CI | no — `DATABASE_URL` absent or non-Vercel |

Previews are opt-in on purpose: a preview backed by a Neon branch wants its
migrations, but one that inherited the production connection string must never
migrate production as a side effect of opening a pull request. Set the flag only
once Preview has its own database branch.

If Vercel does not pick up `vercel-build` automatically, set the project's Build
Command to `bun run vercel-build` explicitly.

## Migration policy

- Schema changes always ship as generated SQL in `./drizzle`, reviewed in PRs.
- Backwards-compatible changes first (add columns nullable/defaulted); destructive
  changes are two-step (expand → migrate data → contract).
- Never hand-edit applied migration files.

## Secrets

- Never commit secrets. `.env*` is gitignored except `.env.example`.
- Rotate `BETTER_AUTH_SECRET` only with a plan for invalidating sessions — it
  signs all session tokens.

## Rollback

Vercel supports instant rollback to previous deployments. Because migrations can
run ahead of app code, prefer additive schema changes so an old deployment keeps
working against a newer schema.
