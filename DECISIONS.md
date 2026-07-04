# Decisions (DEC chain)

This file records project decisions and the work they spawn. Each **DEC** is one
numbered record with a single owner and a status. Manage it with the skills
`/dec-creation`, `/dec-amend`, `/dec-deletion`, `/dec-close` — avoid editing by
hand so the status board stays consistent.

**Statuses:** `Pending` · `In Progress` · `Blocked` · `Done` · `Rejected` · `Superseded`

**Rules:** codes are zero-padded and never reused or renumbered; assignee is a
single `@handle` from `contributors.md` (or `Unassigned`); a contradicting new
DEC supersedes the old one (bidirectional link).

## Status board

| DEC     | Title                          | Status  | Assignee         |
|---------|--------------------------------|---------|------------------|
| DEC-001 | Adopt the DEC chain            | Done    | @patricioguerra  |
| DEC-002 | Ambassadors feature (isolated) | Pending | Unassigned       |
| DEC-003 | Ambassadors recruitment landing | In Progress | @patricioguerra |

---

## DEC-001 — Adopt the DEC chain

- Status: Done
- Assignee: @patricioguerra
- Created: 2026-06-20
- Branch: —
- Supersedes: —
- Superseded by: —
- Related: —

### Context

The repository is opening to outside collaborators and needs a lightweight,
git-native way to record decisions, track their status, and assign ownership.

### Decision

Adopt a single-file DEC chain (`DECISIONS.md`) plus a `contributors.md` table and
four management skills. See `docs/superpowers/specs/2026-06-20-dec-chain-design.md`.

### Tasks

- [x] Define the on-disk format
- [x] Seed the contributors table
- [x] Provide the management skills

## DEC-002 — Ambassadors feature (isolated)

- Status: Pending
- Assignee: Unassigned
- Created: 2026-06-20
- Branch: dec-002-ambassadors-feature
- Supersedes: —
- Superseded by: —
- Related: —

### Context

Athletes ("ambassadors") want to promote and sell their own trainings through
the platform. Each ambassador needs a public landing under `/ambassadors/<slug>`
(e.g. `/ambassadors/gonsalito`) presenting who they are, what they've done, and a
purchase flow for their training. Ambassador trainings and prices differ from the
core product and must stay fully isolated from the rest of the site, while sharing
the same deployment.

### Decision

Build an `ambassadors` feature, fully isolated from the core product but on the
same deployment:

- **Routes:** public area under `/ambassadors`, per-ambassador landing at
  `/ambassadors/<slug>` with bio, track record, and a buy-training CTA.
- **Database:** a separate Supabase project (different organization) — no shared
  tables or auth with the core app.
- **Payments:** a separate Stripe account — own keys, webhook secret, and
  dashboard; money flows independently from core subscriptions.
- **Auth/users:** fully separate user system; ambassadors and their buyers do not
  share the existing `profiles`/auth.
- **Architecture:** a new DDD bounded context `src/modules/ambassadors/`
  (`domain/`, `application/`, `infra/`, `ui/`) per the mandatory pattern, with its
  own Supabase + Stripe infra clients. No cross-context coupling into core
  `identity`/`billing`/`training` infra.

### Tasks

- [ ] Provision separate Supabase project (new org) + env vars
- [ ] Provision separate Stripe account + env vars (keys, webhook secret)
- [ ] Scaffold `src/modules/ambassadors/` bounded context (domain/app/infra/ui)
- [ ] Add ambassador Supabase + Stripe infra clients (isolated from core)
- [ ] Build `/ambassadors` index and `/ambassadors/[slug]` landing pages
- [ ] Implement ambassador purchase/checkout flow against the separate Stripe
- [ ] Define ambassador auth/user model (separate from core profiles)
- [ ] Update the dependency graph in AGENTS.md in the same commit

## DEC-003 — Ambassadors recruitment landing

- Status: In Progress
- Assignee: @patricioguerra
- Created: 2026-06-20
- Branch: dec-003-ambassadors-recruitment-landing
- Supersedes: —
- Superseded by: —
- Related: DEC-002

### Context

Before building the full ambassador selling platform (DEC-002), the site needs a
public-facing page that recruits and explains the program to prospective
ambassadors — "how we work" — reusing the existing site's landing style and
components. Other brands (e.g. running apparel ambassador application pages)
show the kind of structure (story, criteria, application CTA) but their content
and visual style must not be copied.

### Decision

Build a `/ambassadors` recruitment landing page using the existing site's design
system and landing patterns (no new visual style). It explains the ambassador
program and how it works, and ends in an application CTA. This is content/UI
only — no payments, no separate auth, no separate Supabase/Stripe; those remain
scoped to DEC-002.

### Tasks

- [x] Draft landing content sections (who we are, how the program works,
      criteria, application CTA)
- [x] Build `/embajadores` (es) / `/ambassadors` (en) page reusing existing
      layout/components and style
- [x] Wire application CTA via a dedicated `ambassadors` use case that emails
      the admin directly (no auth, no DB) — not the `support` contact flow,
      which requires a signed-in user
- [x] Update the dependency graph in AGENTS.md in the same commit
