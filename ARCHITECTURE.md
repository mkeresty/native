# Architecture

Collaborative Markdown workspace for developers. Google Docs for technical knowledge, Markdown as the canonical format.

## Stack Summary

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router), React, strict TypeScript | Required; server components for data, client components only where needed |
| Package manager / runtime | Bun | Fast installs/scripts; Node-compatible output deploys anywhere |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) | Required; accessible primitives, source-owned components |
| Icons | lucide-react | shadcn default icon library |
| Motion | CSS transitions first; `motion` (Framer Motion lineage) for palette/dialog/presence transitions | Mature, shadcn-compatible, no layout-thrash risk |
| Database | PostgreSQL (Neon free tier) | Managed, branching for preview envs, protocol-standard |
| ORM / migrations | Drizzle ORM + drizzle-kit | Typed schema, plain SQL migrations in version control |
| Auth | Better Auth (email/password; magic link ready) | Self-hosted on our own Postgres → $0 recurring, no vendor tables outside our DB |
| Editor (Phase 2+) | Tiptap 3 / ProseMirror + `y-prosemirror` | Best collaborative-editing story among mature frameworks; rich block model; markdown via serializer extension |
| Collaboration (Phase 4) | Yjs CRDT; sync via PartyKit (`y-partykit`); snapshots to Postgres | Cheapest reliable realtime; Yjs docs are portable if we switch providers |
| Syntax highlighting (Phase 5) | lowlight (highlight.js) inside Tiptap code blocks; Shiki for read-only rendering | Standard Tiptap path; Shiki for high-fidelity static output |
| Command palette (Phase 5) | shadcn `Command` (cmdk) driven by central shortcut registry | Single source of truth for bindings/tooltips/help |
| Hosting | Vercel (hobby/free → paid when needed) + PartyKit | Zero-ops deploys, preview environments per PR |

## Estimated Initial Cost

| Service | Tier | Monthly |
| --- | --- | --- |
| Vercel | Hobby | $0 |
| Neon Postgres | Free | $0 |
| PartyKit | Free tier | $0 |
| Better Auth | self-hosted | $0 |
| **Total** | | **$0** (< $50 target) |

Scale path: Vercel Pro ($20), Neon Launch ($19), PartyKit paid (~$10–20) — still under $50 until real usage.

## Vendor Lock-In Assessment

- **Neon**: plain Postgres over the wire protocol; migratable by dump/restore.
- **Vercel**: app is standard Next.js; deployable to Node/Docker if ever needed.
- **PartyKit**: highest lock-in surface. Mitigated by keeping all realtime behind a `CollaborationProvider` interface and storing canonical state as Markdown + portable Yjs updates in our own database. Swapping to Liveblocks or self-hosted Hocuspocus is a provider swap, not a data migration.
- **Better Auth**: sessions/accounts live in our own tables; no external identity service.

No decision above requires rewriting application code to escape.

## Canonical Document Representation

1. `documents.content_md` (Postgres text) — **canonical, portable Markdown**. Export = read this column.
2. `documents.ydoc_state` — binary Yjs update (base64) for fast collaboration resume.
3. Live editing happens on a Yjs `XmlFragment` mapped to ProseMirror by `y-prosemirror`.
4. On save intervals / last-client-close, the party serializes the fragment back to Markdown and persists both columns. Markdown serialization is the source of truth at rest; the Yjs state is an optimization.

## Interfaces Between Subsystems

```
UI (server components + client islands)
  ↓
Application logic (server actions, command registry)
  ↓
Editor layer (Tiptap wrapper: Markdown ⇄ document model)
  ↓
CollaborationProvider interface (connect/status/presence/applyUpdates)
  ↓
Persistence (Drizzle → Neon; realtime service holds ephemeral updates)
```

Rules:
- UI never imports editor/collaboration internals directly.
- Shortcut registry is the single source consumed by key handlers, palette, tooltips, help screen.
- All colors via semantic tokens (`--background`, `--editor-background`, …). No raw hex/Tailwind palette colors in feature code.

## Database Schema (initial)

Auth tables (`user`, `session`, `account`, `verification`) are owned by Better Auth's Drizzle adapter. Domain tables:

```text
workspaces        id uuid pk, name, slug unique, created_by → user.id, created_at, updated_at
workspace_members id uuid pk, workspace_id fk, user_id fk, role enum('owner','member'),
                  unique(workspace_id, user_id)
folders           id uuid pk, workspace_id fk, parent_folder_id nullable self-fk,
                  name, position int, timestamps
documents         id uuid pk, workspace_id fk, folder_id nullable fk,
                  title, content_md text default '', ydoc_state text nullable,
                  created_by, updated_by → user.id, created_at, updated_at
document_versions id uuid pk, document_id fk cascade, version_number int,
                  title, content_md, created_by → user.id, created_at
```

Roles limited to `owner`/`member` now; enum extends without migration churn later. Soft delete deferred until a real requirement exists.

## Realtime / Collaboration Architecture (Phase 4)

- One PartyKit "party" per open document room: `doc/<documentId>`.
- Clients connect with their auth session cookie; party validates membership against Postgres before admitting.
- Awareness API provides presence (avatars, cursors, selections).
- Connection status surfaced as calm indicators: `● Saved`, `● Saving…`, `⚠ Offline`. Local edits buffer during interruptions; reconnection resyncs automatically (Yjs semantics).
- Persistence: party writes periodic Yjs snapshots + serialized Markdown to Neon.

## CI/CD Pipeline

```text
PR → GitHub Actions: install (bun, frozen lockfile) → typecheck → lint → unit tests → build
   → Vercel preview deployment (migration check runs against preview DB branch)
main (CI green) → automated production deploy
```

- Migrations are versioned SQL files generated by drizzle-kit; applied explicitly via `bun run db:migrate` locally and as the release step in hosted envs.
- Secrets only as environment variables; `.env.example` lists every variable with no real values.

## Theme Architecture

Semantic token set defined once per theme as CSS variables (Tailwind v4 `@theme inline`): background, foreground, muted, border, card, primary, secondary, accent, destructive, plus product tokens: `editor-*`, `code-*`, `sidebar`, `toolbar`, `presence-*`, `comment-*`, `callout-*`.

Light/dark ship by default. A theme = `{ name, variables }`; future premium themes are new variable sets, zero component changes.

## Implementation Phases

0. **Architecture** — this document.
1. **Foundation** — Next.js + TS strict + Tailwind v4 + shadcn tokens/themes, Drizzle + Neon, Better Auth sign-in/up/sign-out, authenticated shell (sidebar skeleton, user menu, empty states), CI, `.env.example`. *Deployable authenticated app shell.*
2. **Documents** — workspaces/folders/documents CRUD, Tiptap editor with core Markdown, persistence, export `.md`.
3. **Keyboard UX** — shortcut registry, command palette, quick open, focus mode, shortcut help.
4. **Collaboration** — Yjs + PartyKit rooms, presence, cursors, status/reconnect. Gate: two browsers converge reliably.
5. **Developer features** — syntax highlighting, copy buttons, tables/checklists/callouts polish, language picker.
6. **History & search** — document_versions, diffs, title/content search, recents.
7. **Polish** — motion pass, loading/empty/error states, a11y, dark-mode audit, performance.
8. **QA** — break it: auth edges, large docs, rapid typing, two-user concurrency, network loss.

Explicitly out of scope for MVP: mobile apps, SSO, RBAC beyond owner/member, billing, Git sync, Slack, AI features, analytics, Kubernetes/microservices.
