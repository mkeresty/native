# Deployment

Target: **Vercel** (app) + **Neon** (Postgres). Total cost at MVP scale: ~$0.

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
3. Set environment variables in Vercel (Production and Preview):

   ```text
   DATABASE_URL=<neon pooled connection string>
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   BETTER_AUTH_URL=https://your-production-domain
   ```

4. Apply migrations to production once:

   ```bash
   DATABASE_URL="<neon prod url>" bun run db:migrate
   ```

## CI/CD

`.github/workflows/ci.yml` runs on every PR and push to `main`:

```text
install (bun, frozen lockfile)
  → typecheck (tsc --noEmit)
  → lint (eslint)
  → build (next build)
```

Rules of the pipeline:

- PRs get a Vercel preview deployment automatically (Vercel GitHub integration).
- Merge to `main` only when CI is green; Vercel deploys `main` to production.
- Migrations are applied explicitly with `bun run db:migrate` against the target
  database. For automated deploys, run it as a release step before traffic shifts.

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
