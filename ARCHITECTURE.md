# Architecture

Collaborative Markdown workspace for developers. Google Docs for technical knowledge, Markdown as the canonical format.

## Product Model

Native supports two first-class modes:

1. **Native workspace** — documents live and collaborate entirely in Native. No repository is required.
2. **Git-backed workspace** — the same Native documents may additionally map to Markdown files in a GitHub repository and be deliberately published as commits or pull requests.

GitHub is a core product capability, but it is **optional**. Connecting a repository must never be required to create a workspace, write a document, collaborate, search, use history, or export Markdown.

The architectural test for every core feature is:

> Does this still work when `repository_id` is null?

If not, the feature is too tightly coupled to Git.

## Stack Summary

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router), React, strict TypeScript | Required; server components for data, client components only where needed |
| Package manager / runtime | Bun | Fast installs/scripts; Node-compatible output deploys anywhere |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) | Required; accessible primitives, source-owned components |
| Icons | lucide-react | shadcn default icon library |
| Motion | CSS transitions first; `motion` for palette/dialog/presence transitions | Mature, shadcn-compatible, no layout-thrash risk |
| Database | PostgreSQL (Neon free tier) | Managed, portable Postgres, suitable for collaborative working state and metadata |
| ORM / migrations | Drizzle ORM + drizzle-kit | Typed schema, plain SQL migrations in version control |
| Auth | Better Auth | Self-hosted on our own Postgres, low recurring cost |
| Editor | Tiptap 3 / ProseMirror + `y-prosemirror` | Mature rich editor and collaboration model; Markdown serialization |
| Collaboration | Yjs CRDT; sync via PartyKit (`y-partykit`); snapshots to Postgres | Realtime collaboration without coupling Git to live editing |
| Git provider | GitHub initially | Core developer workflow; repository import, diffs, commits, and PRs |
| Syntax highlighting | lowlight inside Tiptap; Shiki for read-only rendering | Standard editor path plus high-fidelity static output |
| Command palette | shadcn `Command` (cmdk) driven by central shortcut registry | Single source of truth for bindings/tooltips/help |
| Hosting | Vercel + PartyKit | Low-ops deploys and preview environments |

## Canonical Document Representation

1. `documents.content_md` — **canonical, portable Markdown at rest**.
2. `documents.ydoc_state` — optional persisted Yjs state for fast collaboration resume.
3. Live editing occurs through Yjs mapped to ProseMirror.
4. The collaborative state serializes back to Markdown for persistence.
5. CRDT state must never become the only representation of a document.

Markdown is the common representation used for Native persistence, `.md` import/export, search, Native version history, Git diffs, commits, pull requests, and future Git providers.

The editor must not care whether a document is Git-backed.

## Core Data Flow

```text
                         Native
                           |
              +------------+------------+
              |                         |
         Native-only                 Git-backed
         documents                   documents
              |                         |
              +------------+------------+
                           |
                 Tiptap / ProseMirror
                           |
                          Yjs
                           |
                   Canonical Markdown
                           |
                       Postgres
                    working state
                           |
                    optional Git layer
                           |
                   Review Markdown diff
                           |
                   Commit / Pull Request
                           |
                         GitHub
```

## Postgres vs Git

Postgres and Git solve different problems.

### Postgres is the collaborative working tree

Postgres stores current application state: users/workspaces, memberships/permissions, immutable Native document identity, current Markdown, Native version history, collaboration metadata/state, and repository mapping/sync metadata.

Autosave may update Postgres frequently. Typing must never create Git commits automatically.

### Git is deliberate published engineering history

For Git-backed documents, Git represents deliberate checkpoints chosen by the team.

```text
Git HEAD
   |
   +-- base state

Postgres Markdown
   |
   +-- collaborative working tree

Review Changes
   |
   +-- Markdown diff

Publish
   |
   +-- commit or pull request
```

The UI must distinguish **Saved** from **Published to GitHub**.

## Interfaces Between Subsystems

```text
UI
  ↓
Application logic
  ↓
Editor layer (Markdown ⇄ document model)
  ↓
CollaborationProvider (Yjs/realtime)
  ↓
Persistence (Postgres working state)
  ↓
GitProvider / Repository service (optional)
  ↓
GitHub
```

Rules:

- Editor code must not contain GitHub-specific logic.
- Collaboration must work identically for Native-only documents.
- Git publishing operates on canonical Markdown, not raw CRDT internals.
- GitHub credentials/tokens remain in the integration layer.
- Shortcut registry remains the single source for key handlers, palette, tooltips, and help.
- All colors use semantic theme tokens.

## Database Schema

Existing Native domain tables remain valid:

```text
workspaces
workspace_members
folders
documents
document_versions
```

Git support extends this model rather than replacing it.

Conceptual addition:

```text
repository_connections
  id uuid pk
  workspace_id fk
  provider              // initially github
  owner
  repo
  installation_id
  default_branch
  root_path
  created_at
  updated_at
```

Documents gain nullable Git mapping fields conceptually equivalent to:

```text
repository_id nullable
git_path nullable
base_blob_sha nullable
last_synced_commit_sha nullable
sync_status nullable
```

The exact schema should be finalized during implementation; avoid speculative fields that are not needed.

### Document identity

A Native UUID is always the document identity. Filename/path is not identity.

```text
id: 8ac1...                         // stable Native identity
title: Authentication Architecture
repository_id: repo_123             // nullable
git_path: architecture/auth.md      // nullable
content_md: ...
```

Renaming the display title must not silently rename a Git file. A file/path rename is an explicit Git-visible operation.

## Native Folders vs Git Paths

Native-only workspaces may continue using Native folder records.

For Git-backed content, repository paths are authoritative for filesystem hierarchy.

```text
repository: acme/backend
root_path: docs/

docs/
├── architecture/
│   └── authentication.md
└── runbooks/
    └── redis.md
```

The sidebar should render this naturally as a document tree. Do not require proprietary folder IDs to define the hierarchy of Git-backed files.

## Workspace Onboarding

Users should be able to start without repository access:

```text
How do you want to start?

[ Start with a blank workspace ]
[ Connect GitHub ]
[ Import Markdown ]
```

A Native-only workspace should be connectable to GitHub later without recreating documents.

## GitHub MVP Workflow

GitHub publishing is part of the product MVP direction, but full bidirectional synchronization is not required initially.

Initial workflow:

1. Connect GitHub.
2. Select repository.
3. Select documentation directory/root path.
4. Import/discover Markdown files.
5. Map them to stable Native document IDs.
6. Edit using the normal collaborative Native editor.
7. Autosave working state to Postgres.
8. Surface unpublished changes.
9. Review Git-style Markdown diffs.
10. Publish through a commit or pull request.

For team repositories, pull requests should be the recommended/default workflow. Direct commits may be available for simpler/personal repositories.

## Git Sync State

Git-backed documents need to know which repository state their working copy is based on. At minimum retain a last-synchronized/base commit SHA and, where useful, blob SHA information.

A repository-level sync record may eventually track operations, but do not introduce it until implementation shows it is useful.

## External GitHub Changes

Full inbound synchronization may follow the initial outbound publishing workflow, but the architecture must anticipate it.

If Native last synchronized at commit `ABC` and GitHub is now at `DEF`, compare `ABC → DEF` to identify externally changed tracked files.

If external changes do not overlap locally modified documents, they may eventually be pulled automatically. If both Native and GitHub changed the same document, never silently overwrite either side.

Use a three-way reconciliation model:

```text
BASE
last synchronized Markdown

OURS
current collaborative Native Markdown

THEIRS
current GitHub Markdown
```

External Git changes are Markdown revisions, not Yjs operations. Do not manufacture CRDT operations from arbitrary commits merely to route them through realtime collaboration.

## Version History

Native history and Git history are separate by design.

### Native history

Native history protects the editing experience and supports recovery, restore, periodic/meaningful snapshots, and diffs between Native snapshots. Do not create a version for every keystroke.

### Git history

Git history contains deliberately published engineering checkpoints: commits, branches, pull requests, and repository review/history.

Restoring a Native version creates a new current state rather than deleting subsequent history.

## Diffs

Diffs do not need to be persisted for the MVP. Native can compute textual Markdown diffs from two snapshots when needed.

For Git publishing, compare the Git base Markdown with the current Postgres Markdown.

```diff
- Tokens expire after 24 hours.
+ Access tokens expire after 15 minutes.
```

The review experience should feel familiar to developers.

## Realtime / Collaboration Architecture

- One PartyKit room per open Native document.
- Clients authenticate against Native workspace membership.
- Awareness provides presence, cursors, and selections.
- Connection status uses calm indicators such as `Saved`, `Saving…`, and `Offline`.
- Local edits buffer/resync according to Yjs semantics.
- Periodic state persists Markdown plus any required Yjs snapshot to Postgres.

GitHub is not the realtime transport.

## Search

Native-only and Git-backed documents participate in the same search experience. Search operates against Native's current/indexed state rather than using GitHub search for normal navigation. Postgres search is sufficient initially.

## Authentication and Authorization

Native authorization and GitHub repository authorization are distinct.

A user may have permission to edit a Native workspace without having permission to publish to its connected repository. Server-side authorization must enforce both layers.

## CI/CD Pipeline

```text
PR → GitHub Actions: install → typecheck → lint → unit tests → build
   → Vercel preview deployment
main (CI green) → automated production deploy
```

Migrations are versioned through Drizzle. Secrets remain environment variables. `.env.example` documents required variables without real values.

## Theme Architecture

Semantic tokens are defined once per theme as CSS variables. Light/dark ship by default. Future premium themes are additional variable sets, not component rewrites. Git UI such as diff status and changed-file states must also use semantic tokens.

## Implementation Phases

0. **Architecture** — product and system boundaries. ✅
1. **Foundation** — Next.js, TypeScript, Tailwind/shadcn, Drizzle/Neon, Better Auth, authenticated shell, CI. ✅
2. **Documents** — Native workspace/folder/document CRUD, Tiptap Markdown editor, autosave, export `.md`. ✅
3. **Keyboard UX** — shortcut registry, command palette, quick open, focus mode, shortcut help. ✅
4. **Collaboration** — Yjs + PartyKit, presence, cursors, status/reconnect. Gate: two browsers converge reliably.
5. **Developer features** — syntax highlighting, code blocks, tables/checklists/callouts polish.
6. **Native history & search** — snapshots/diffs, title/content search, recents.
7. **GitHub foundation** — GitHub connection, repository selection, root-path selection, repository/document mapping.
8. **GitHub publishing** — import/discover `.md`, unpublished-change detection, diff review, commit and PR creation.
9. **Polish & QA** — motion, states, accessibility, performance, auth/editor/collaboration/Git edge cases.
10. **Inbound Git sync** — external-change detection and safe reconciliation after outbound publishing is proven.

## Explicit MVP Boundaries

In scope for the Git-enabled MVP direction:

- Native-only workspaces
- Markdown import/export
- collaborative editing
- Native autosave/history/search
- optional GitHub connection
- repository selection
- docs/root-directory selection
- Markdown repository import/discovery
- Git-style change review
- commit creation
- pull request creation

Can be deferred:

- automatic inbound webhooks
- fully automatic bidirectional synchronization
- sophisticated three-way conflict UI
- GitLab
- Bitbucket
- advanced branch management
- arbitrary binary-file synchronization
- repository-wide source-code editing
- mobile apps
- enterprise SSO
- complex RBAC
- AI features
- Slack integration
- Kubernetes/microservices

## Long-Term Direction

Native should become the fastest, nicest way for engineering teams to collaboratively maintain technical knowledge while retaining ownership of that knowledge as portable Markdown.

```text
Excellent editor
      ↓
Realtime collaboration
      ↓
Markdown portability
      ↓
Optional GitHub-backed documents
      ↓
PR / engineering workflows
      ↓
Bidirectional Git synchronization
      ↓
Developer-specific tooling
```

Do not turn Native into a generic Notion/project-management clone. New functionality should primarily improve the creation, collaboration, review, publishing, or maintenance of technical documentation.