Absolutely. Given that you're solo, I would make the agent prompt **opinionated about architecture and scope**. The biggest risk is an agent happily spending 3 weeks building an overengineered SaaS platform instead of getting a beautiful collaborative editor running.

I'd also explicitly tell it to **make architectural decisions rather than constantly asking you questions**, while requiring it to document important tradeoffs.

Here’s the prompt I'd hand it:

# Collaborative Markdown Workspace — MVP Engineering Specification

## 1. Product Overview

Build a modern, developer-focused collaborative Markdown workspace.

The core product concept is:

> **Google Docs for technical knowledge, with Markdown as the underlying format.**

The application should provide a clean, fast, highly keyboard-driven editing experience for developers and technical teams.

The product is NOT intended to be a generic Notion clone or a feature-heavy enterprise knowledge-management platform.

The MVP should focus on making one thing exceptionally good:

> Multiple developers can open the same technical document, edit it simultaneously, and maintain clean, portable Markdown while having a polished, modern document-editing experience.

The underlying content should remain portable and ideally representable as standard Markdown rather than being locked into a proprietary format.

Potential future use cases include:

* Engineering documentation
* Architecture documentation
* RFCs
* Incident reports
* Runbooks
* Meeting notes
* Project specifications
* Developer research
* Onboarding documentation
* Technical knowledge bases

Do not build all of these as separate products or workflows in the MVP. They should simply be possible using the core document system.

---

# 2. Primary Product Principles

The implementation should follow these principles in priority order:

1. **Excellent editing experience**
2. **Fast keyboard-first workflow**
3. **Real-time collaboration**
4. **Markdown portability**
5. **Developer-centric features**
6. **Beautiful but restrained UI**
7. **Simple architecture**
8. **Cheap to operate**
9. **Easy to extend later**
10. **Production-quality deployment**

Avoid premature enterprise architecture.

This is being built by a solo developer, so every architectural decision should consider:

* Development time
* Operational complexity
* Monthly infrastructure cost
* Ease of debugging
* Ability to scale later without rewriting the entire application

Prefer boring, well-supported technologies over custom infrastructure.

---

# 3. Technology Requirements

## Frontend

Use:

* React
* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

Use the current stable versions of these technologies.

Use the Next.js App Router unless there is a compelling technical reason not to.

The codebase should use strict TypeScript.

Avoid unnecessary client components.

Prefer server components where appropriate, while keeping the actual collaborative editor client-side.

---

# 4. UI / Design System

Use shadcn/ui as the foundation of the design system. Use the shadcn skill defined in this repo.

The application should feel:

* Modern
* Minimal
* Developer-oriented
* Fast
* Calm
* Dense enough for technical work
* Not overly corporate
* Not visually noisy

Think:

> Linear + GitHub + Google Docs

rather than:

> Notion + enterprise SaaS dashboard

Do not blindly use every shadcn component.

Build a small, coherent design system around the actual product.

---

# 5. Themeability

Themeability is a first-class architectural requirement.

The application should be designed so that visual themes can eventually become a paid add-on.

Do NOT hardcode colors throughout components.

Use semantic design tokens / CSS variables for:

* Background
* Foreground
* Muted foreground
* Borders
* Cards
* Primary
* Secondary
* Accent
* Destructive
* Editor background
* Editor foreground
* Code background
* Code foreground
* Selection
* Cursor/presence colors
* Sidebar
* Toolbar
* Comments
* Callouts

A theme should ideally be represented by a small configuration object or CSS variable set.

Example conceptual structure:

```ts
type Theme = {
  name: string;
  variables: Record<string, string>;
};
```

Do not over-engineer the theme engine in the MVP.

However, the architecture must make it easy to add:

* Light themes
* Dark themes
* Developer/editor themes
* Custom team themes
* Premium themes

without rewriting UI components.

The default application should ship with a polished light theme and dark theme.

---

# 6. Motion / Animation

Motion is important.

The application should feel polished through **subtle, purposeful motion**, not flashy animations.

Use a modern React animation solution.

Prefer existing shadcn-compatible motion components/utilities where they make sense.

The user specifically likes the Motion SDK ecosystem, but do not introduce unnecessary dependencies merely because they are fashionable.

Evaluate available options and choose the simplest mature approach.

Motion should be used for things such as:

* Sidebar expansion/collapse
* Command palette
* Dialogs
* Dropdowns
* Document switching
* Presence indicators
* Toasts
* Comments appearing/disappearing
* Toolbar state changes
* Panel resizing
* Empty states
* Subtle hover interactions
* Page transitions where appropriate

Avoid:

* Excessive bouncing
* Long animations
* Animation that interferes with typing
* Animation that delays interaction
* Gratuitous parallax
* Heavy visual effects

The editor itself must always feel instantaneous.

---

# 7. Keyboard-First UX

This is one of the most important requirements.

**Almost every meaningful editing action should have a keyboard binding.**

The application should feel like software built for developers who prefer keyboard workflows.

Examples:

* New document
* Open document
* Search
* Global search
* Rename document
* Delete document
* Move document
* Toggle sidebar
* Toggle preview
* Toggle focus mode
* Toggle command palette
* Insert heading
* Insert code block
* Insert link
* Insert table
* Insert checklist
* Insert quote
* Insert callout
* Navigate headings
* Navigate documents
* Save/sync
* Open comments
* Add comment
* Navigate comments
* Undo
* Redo
* Formatting
* Indentation
* Block movement

Use familiar conventions wherever possible.

Examples:

```text
⌘/Ctrl + K      Command palette
⌘/Ctrl + P      Quick document switcher
⌘/Ctrl + Shift + P
                Command palette / actions
⌘/Ctrl + S      Save/sync where appropriate
⌘/Ctrl + Shift + F
                Search
⌘/Ctrl + B      Bold
⌘/Ctrl + I      Italic
⌘/Ctrl + Shift + 7
                Ordered list
⌘/Ctrl + Shift + 8
                Bullet list
```

Do not blindly follow these exact bindings if they conflict with browser/editor conventions.

The agent should create a centralized keyboard shortcut registry.

For example:

```ts
const shortcuts = {
  commandPalette: "Mod+K",
  quickOpen: "Mod+P",
  search: "Mod+Shift+F",
  toggleSidebar: "Mod+\\",
};
```

The same registry should drive:

* Keyboard handling
* Command palette
* Tooltip descriptions
* Shortcut help
* Documentation

This prevents shortcuts from becoming inconsistent.

Provide a keyboard shortcut help screen.

---

# 8. Command Palette

The command palette should be a major part of the UX.

Users should be able to press:

```text
⌘K
```

and perform nearly every major application action.

Commands should include things such as:

* New document
* New folder
* Open document
* Search documents
* Rename document
* Delete document
* Move document
* Duplicate document
* Toggle sidebar
* Toggle focus mode
* Toggle preview
* Insert code block
* Insert diagram
* Insert table
* Toggle theme
* Change theme
* Invite collaborator
* View version history
* Open keyboard shortcuts
* Sign out

Commands should be searchable.

Commands should display their keyboard shortcut.

---

# 9. Editor

The editor is the centerpiece of the application.

Do not implement a simplistic textarea.

Use a mature editor framework appropriate for rich collaborative editing.

Evaluate options such as:

* Tiptap / ProseMirror
* CodeMirror
* Lexical
* Other mature editor frameworks

Choose the option that provides the best foundation for:

* Collaborative editing
* Markdown
* Rich block editing
* Code blocks
* Selection
* Comments
* Future extensibility
* Keyboard shortcuts

Document the decision and tradeoffs.

## Important

The user experience should feel like a polished document editor rather than a raw code editor.

Users should be able to type:

```markdown
# Architecture

## Overview

Our application consists of...

```

and interact with the rendered structure naturally.

Markdown should remain a first-class representation.

---

# 10. Markdown

Support at minimum:

* Headings
* Paragraphs
* Bold
* Italic
* Strikethrough
* Links
* Lists
* Ordered lists
* Checklists
* Blockquotes
* Code blocks
* Inline code
* Tables
* Horizontal rules
* Images
* Basic callouts/admonitions

Support syntax highlighting for common programming languages.

The architecture should allow future support for:

* Mermaid
* Math
* Diagram blocks
* Embedded content

Do not spend excessive time implementing advanced Markdown extensions during the initial MVP.

---

# 11. Developer Experience

The editor should be particularly good for developers.

Code blocks should have:

* Syntax highlighting
* Language selection
* Copy button
* Clean typography
* Good dark-mode rendering
* Keyboard navigation

Potential future features should be architecturally possible:

* GitHub links
* Git repositories
* File references
* Line references
* Terminal snippets
* Code review comments
* Mermaid diagrams

Do not build these all now.

---

# 12. Real-Time Collaboration

Real-time collaboration is a core MVP requirement.

Two or more users should be able to:

1. Open the same document
2. See each other's presence
3. Edit simultaneously
4. See changes propagate in near real-time
5. Avoid destructive conflicts

Show:

* Collaborator avatars
* Active collaborators
* Cursor/selection presence where practical
* Connection status

The collaboration layer should use an established CRDT / synchronization technology rather than custom synchronization logic.

Strong candidates include:

* Yjs
* Liveblocks
* Another mature CRDT-based provider

Evaluate cost and complexity.

Because this is a solo project, prioritize:

> Lowest operational complexity + reasonable free/low-cost tier

over building custom WebSocket infrastructure.

---

# 13. Persistence

Documents must persist reliably.

Use a relational database.

Recommended starting point:

* PostgreSQL

Prefer a managed provider with a generous free/cheap tier.

Candidate providers can include:

* Supabase
* Neon
* Another comparable managed PostgreSQL provider

Do not deploy a database manually unless there is a compelling reason.

The schema should support:

* Users
* Workspaces
* Workspace members
* Documents
* Folders
* Document versions
* Collaboration metadata
* Comments (if implemented in MVP)
* Themes/preferences

Design the schema so future functionality can be added without major migrations.

---

# 14. Workspace Model

The basic hierarchy should be:

```text
User
  └── Workspace
        ├── Members
        ├── Folders
        │     └── Documents
        └── Documents
```

A user should be able to belong to multiple workspaces eventually.

Do not implement complex enterprise RBAC in the MVP.

Start with simple roles such as:

* Owner
* Member

The architecture should allow additional roles later.

---

# 15. Documents

Each document should have:

* ID
* Title
* Content
* Workspace
* Parent folder
* Created timestamp
* Updated timestamp
* Created by
* Updated by

Support:

* Create
* Rename
* Delete
* Duplicate
* Move
* Search
* Open
* Recent documents

Document loading should be fast.

Avoid unnecessary loading of the entire workspace.

---

# 16. Sidebar

The sidebar should contain:

* Workspace selector
* Search
* New document
* New folder
* Folder/document tree
* Recent documents
* User/workspace controls

The sidebar should be collapsible.

Keyboard shortcut:

```text
⌘/Ctrl + \
```

or another sensible binding.

The editor should have a distraction-free/focus mode that hides unnecessary chrome.

---

# 17. Search

MVP search should support:

* Document title search
* Content search
* Workspace-level search

Search should eventually be able to scale to full-text search.

Do not build a complicated search infrastructure prematurely.

Start with the simplest architecture that will work for a small workspace.

---

# 18. Version History

Basic document history should be included if it can be implemented without delaying the MVP substantially.

Users should be able to see:

* Previous versions
* Timestamp
* Author
* Basic diff

Developer-friendly diff presentation is preferred.

Example:

```diff
- Redis timeout is 500ms
+ Redis timeout is 1000ms
```

Do not attempt to recreate Google Docs' complete infinite revision system.

---

# 19. Comments

If comments can be implemented cleanly without destabilizing collaboration, support basic comments.

A comment should support:

* Author
* Timestamp
* Text
* Resolved state
* Association with a document/block/selection

Keyboard-accessible comment creation is required.

Comments should not turn the MVP into a full project-management system.

---

# 20. Git / Markdown Portability

Portability is an important product principle.

The application should never make users feel trapped.

Design the document model so Markdown export is straightforward.

At minimum, support:

```text
Export document → .md
```

If time permits, implement GitHub integration after the core editor is stable.

Git synchronization should NOT delay the initial collaborative editor.

Potential future architecture:

```text
Workspace
    ↓
Markdown documents
    ↓
Git repository
    ↓
GitHub
```

The product should eventually be able to function as a collaborative editing layer over a Git-based documentation repository.

---

# 21. Authentication

Use a mature authentication solution.

Do not build authentication from scratch.

Support at minimum:

* Email/password or magic link
* OAuth if inexpensive/simple
* Sign out
* Session persistence

Keep authentication simple for MVP.

---

# 22. Billing / Monetization

The product is intended to eventually be monetized.

However, monetization must not create unnecessary MVP complexity.

Do not build a complicated billing system before product validation.

The architecture should make it easy to add Stripe later.

Potential pricing model:

```text
Free
- Small number of documents/users
- Basic collaboration

Pro
- Unlimited documents
- Collaboration
- Advanced history
- Developer features
- Themes

Team
- Team administration
- Shared workspaces
- Advanced permissions
- Git integrations
```

Exact pricing is not part of this engineering task.

The important requirement is that the application architecture should allow feature limits and workspace-level entitlements later.

---

# 23. Cost Constraints

This is a solo-developer MVP.

Optimize for extremely low initial operating costs.

Target:

> Ideally under ~$50/month before meaningful usage.

Absolute priority:

* Use free tiers where reasonable
* Avoid unnecessary managed services
* Avoid expensive realtime infrastructure
* Avoid unnecessary background workers
* Avoid Kubernetes
* Avoid microservices
* Avoid dedicated Redis unless actually required
* Avoid custom infrastructure
* Avoid premature scaling architecture

The application should initially be deployable with a small number of services.

Preferred conceptual architecture:

```text
Next.js application
        │
        ├── PostgreSQL
        │
        ├── Auth
        │
        └── Realtime provider
```

Do not introduce additional infrastructure without documenting why it is necessary.

---

# 24. Deployment

The application must be production-deployable.

Use a conventional CI/CD workflow.

At minimum:

```text
Git push
    ↓
CI
    ├── TypeScript check
    ├── Lint
    ├── Unit tests
    ├── Build
    └── Other validation
    ↓
Deployment
    ↓
Production
```

Use GitHub Actions or an equivalent mature CI system.

Every pull request should run automated checks.

The main branch should only be deployable when CI passes.

Production deployments should be automated.

---

# 25. Environments

Create separate environments for:

* Local development
* Preview/staging
* Production

Secrets must never be committed.

Use environment variables appropriately.

Document:

```text
.env.local
.env.example
```

`.env.example` should contain every required variable without real secrets.

---

# 26. Database Migrations

Database schema changes must be version-controlled.

Never rely on manually modifying production databases.

Use a proper migration system.

Document:

* Local migration workflow
* Preview/staging migration workflow
* Production migration workflow

---

# 27. Testing

Do not aim for 100% test coverage.

Prioritize tests around critical functionality.

At minimum test:

* Authentication
* Document creation
* Document persistence
* Document permissions
* Markdown serialization/deserialization
* Keyboard command registry
* Critical editor behavior
* Collaboration synchronization where practical

Add integration/end-to-end tests for the most important user journey:

```text
Sign in
→ Create workspace
→ Create document
→ Edit document
→ Reload
→ Document persists
```

If practical, add a multiplayer test for:

```text
User A edits document
User B sees change
User B edits document
User A sees change
```

---

# 28. Performance

The editor must feel instantaneous.

Pay particular attention to:

* Typing latency
* Collaboration latency
* Initial document load
* Switching documents
* Search
* Sidebar interactions
* Command palette
* Animations

Do not introduce unnecessary rerenders.

The editor should not rerender the entire application on every keystroke.

Measure before optimizing, but avoid obvious architectural mistakes.

---

# 29. Accessibility

Use accessible primitives from shadcn/Radix where possible.

Support:

* Keyboard navigation
* Visible focus states
* Screen-reader labels
* Accessible dialogs
* Accessible menus
* Accessible tooltips
* Proper semantic structure

Keyboard-first does NOT mean mouse/accessibility support should be neglected.

---

# 30. Error Handling

The application should gracefully handle:

* Lost connection
* Realtime connection failures
* Database errors
* Authentication expiration
* Invalid documents
* Failed saves
* Failed invitations
* Network interruption

Show clear, unobtrusive status indicators.

For example:

```text
● Saved
● Saving…
⚠ Offline
⚠ Connection lost
```

Do not use alarming UI for routine transient network issues.

---

# 31. Offline / Network Resilience

Do not attempt full offline-first functionality in the initial MVP unless the chosen collaboration framework provides it naturally.

However:

* Do not lose local edits during temporary network interruptions.
* The editor should make it obvious when synchronization is unavailable.
* Reconnection should recover automatically where possible.

Full offline functionality can be a future feature.

---

# 32. Project Structure

Use a clean, scalable Next.js project structure.

Separate:

* UI components
* Editor components
* Editor extensions
* Collaboration
* Database
* Authentication
* Workspace logic
* Keyboard shortcuts
* Theme system
* Utilities

Avoid giant components.

Avoid putting business logic directly into page components.

Create clear boundaries between:

```text
UI
↓
Application logic
↓
Persistence / external services
```

---

# 33. Dependency Philosophy

Before adding a dependency, ask:

1. Is it necessary?
2. Is it mature?
3. Is it maintained?
4. Does it significantly reduce complexity?
5. Does it introduce a meaningful recurring cost?
6. Could a small amount of local code solve the problem more cleanly?

Prefer established libraries.

Do not install libraries merely because they are popular.

---

# 34. MVP Scope Discipline

This is extremely important.

Do NOT build:

* Mobile applications
* Enterprise SSO
* Complex RBAC
* Advanced billing
* Full Git synchronization
* Slack integration
* Dozens of AI features
* Advanced analytics
* Complex notification systems
* Elaborate admin dashboards
* Custom infrastructure
* Kubernetes
* Multi-region deployment
* Enterprise compliance tooling

unless the core MVP is already working and there is a compelling reason.

The goal is:

> **A beautiful, production-quality collaborative Markdown editor — not a complete SaaS company.**

---

# 35. Suggested Implementation Phases

## Phase 1 — Foundation

Build:

* Next.js project (Bun)
* TypeScript
* Tailwind
* shadcn
* Design tokens
* Theme architecture
* Basic layout
* CI
* Deployment
* Database
* Authentication

Deliverable:

> A deployed authenticated application shell.

---

## Phase 2 — Documents

Build:

* Workspace
* Sidebar
* Folders
* Documents
* Create/rename/delete
* Editor
* Markdown support
* Persistence

Deliverable:

> A user can create and edit Markdown documents.

---

## Phase 3 — Keyboard UX

Build:

* Command palette
* Shortcut registry
* Keyboard navigation
* Editor shortcuts
* Quick document switching
* Focus mode

Deliverable:

> A developer can operate most of the application without touching the mouse.

---

## Phase 4 — Collaboration

Build:

* CRDT-based collaboration
* Presence
* Cursors
* Connection status
* Reconnection

Deliverable:

> Two users can simultaneously edit the same document reliably.

---

## Phase 5 — Developer Features

Build:

* Syntax highlighting
* Code blocks
* Tables
* Checklists
* Callouts
* Mermaid if straightforward
* Developer-oriented rendering

Deliverable:

> The editor feels genuinely optimized for technical documentation.

---

## Phase 6 — History / Search

Build:

* Version history
* Diffs
* Document search
* Recent documents

Deliverable:

> The product is useful as an actual team knowledge workspace.

---

## Phase 7 — Polish

Focus heavily on:

* Motion
* Transitions
* Loading states
* Empty states
* Error states
* Keyboard shortcuts
* Accessibility
* Responsive behavior
* Performance
* Visual consistency

Do a dedicated UX polish pass rather than continuously adding features.

---

# 36. Definition of Done

The MVP is complete when a developer can:

1. Visit the production application.
2. Create an account.
3. Create a workspace.
4. Create a Markdown document.
5. Edit the document in a polished editor.
6. Use keyboard shortcuts for common operations.
7. Invite another user.
8. Have both users edit the document simultaneously.
9. See collaborators/presence.
10. Reload the page without losing the document.
11. Search for documents.
12. Organize documents into folders.
13. View basic document history.
14. Export Markdown.
15. Switch between light/dark themes.
16. Use the application comfortably without constant mouse interaction.
17. Experience fast, subtle UI animations.
18. Use the application without obvious accessibility problems.
19. See meaningful errors instead of broken UI when something goes wrong.
20. Have the application deployed through a repeatable CI/CD process.

---

# 37. Agent Working Style

You are acting as the primary engineer for this project.

Do not blindly implement every possible feature.

Before beginning implementation:

1. Inspect the repository.
2. Determine whether anything already exists.
3. Create an architecture/implementation plan.
4. Identify the minimum required dependencies.
5. Identify any architectural risks.
6. Choose the simplest viable implementation.

When choosing between multiple technologies, prefer:

> Simpler + cheaper + mature + easy to replace

over:

> Most powerful + most sophisticated.

Do not ask for approval for trivial implementation decisions.

Make reasonable engineering decisions autonomously.

Ask for clarification only when a decision would materially change the product or require an irreversible architectural choice.

---

# 38. Documentation Requirements

Maintain concise project documentation.

At minimum create:

```text
README.md
ARCHITECTURE.md
DEVELOPMENT.md
DEPLOYMENT.md
```

Document:

* Architecture
* Local development
* Environment variables
* Database setup
* Migrations
* CI/CD
* Deployment
* Realtime architecture
* Theme architecture
* Keyboard shortcut architecture
* Major architectural decisions

Do not write enormous documentation nobody will maintain.

---

# 39. Final Quality Bar

The MVP should not feel like:

> "A developer made a quick CRUD app."

It should feel like:

> "This is an early-stage developer product that could plausibly become a real SaaS."

That means:

* Excellent typography
* Consistent spacing
* Thoughtful empty states
* Fast interactions
* Keyboard-first UX
* Beautiful dark mode
* Subtle motion
* Good error states
* Good loading states
* No obvious visual bugs
* No unnecessary UI
* No dead buttons
* No fake functionality
* No placeholder content in production

At the same time, do not sacrifice shipping speed for unnecessary perfection.

The goal is a **small but exceptionally polished MVP**.

---

# 40. First Task

Do not immediately start implementing every feature.

First:

1. Inspect the repository.
2. Produce a concise architecture proposal.
3. Identify the exact libraries/services you recommend.
4. Estimate their initial monthly cost.
5. Identify anything that could create significant vendor lock-in.
6. Define the initial database schema.
7. Define the editor/collaboration architecture.
8. Define the CI/CD pipeline.
9. Define the initial implementation phases.
10. Then begin implementation of Phase 1.

When implementation begins, work in small, logically separated commits.

After each major phase, run the relevant tests, linting, type checks, and production build.

The final result should be deployable, reproducible, and maintainable by a single developer.
