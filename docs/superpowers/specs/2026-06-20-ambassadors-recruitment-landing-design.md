# Ambassadors Recruitment Landing — Design

Date: 2026-06-20
Status: Approved
DEC: DEC-003 (related: DEC-002)

## Goal

Public page explaining the ambassador program to prospective ambassadors and
ending in an application CTA. Content/UI only — no payments, no separate
auth, no separate Supabase/Stripe (those stay scoped to DEC-002). Reuses the
existing site's design system and landing patterns; no new visual style.

## Decisions

- Route: `/embajadores` (es) / `/ambassadors` (en) — follows the existing
  translated-slug pattern (`/que-es-athx` → `/what-is-athx`).
- Not linked from nav/footer/home yet. Reachable by direct URL / future
  marketing. Internal linking is a separate follow-up, not part of this DEC.
- Application CTA submits via a **new public, unauthenticated form** — not
  the existing `support` contact flow. `sendNewMessage` requires
  `getCurrentUser()` and writes to `support_threads` (FK to `profiles`),
  which doesn't fit anonymous visitors. The new flow sends an email only —
  no DB row, no thread, no auth.
- Content sections use placeholder copy (program mechanics, criteria,
  benefits) for now — structure is real, numbers/wording to be replaced
  before launch.

## New module — `src/modules/ambassadors/`

Minimal scope now; DEC-002 later adds Supabase/Stripe infra to the same
context.

### `domain/validators.ts`
Pure functions, mirrors `support/domain/validators.ts` style:
- `validateName(name): string | null`
- `validateEmail(email): string | null` (format check only)
- `validateMessage(message): string | null` (min/max length)
- Social link field is optional — light URL format check inline in the use
  case, no dedicated validator needed.

### `infra/email-client.ts`
- `sendApplicationToAdmin(input: { name, email, socialLink?, message }): Promise<{ skipped: boolean }>`
- Mirrors `support/infra/email-client.ts`: Resend client gated on
  `RESEND_API_KEY` + `ADMIN_EMAIL`, `from: RESEND_FROM_EMAIL`,
  `to: ADMIN_EMAIL`, `replyTo: input.email`.

### `application/apply.ts`
- `'use server'`
- `applyAsAmbassador(input): Promise<{ error?: string }>`
- Validates name/email/message → calls `sendApplicationToAdmin` → swallow
  email errors like `sendNewMessage` does (log, don't fail the request).
- No auth check, no repository, no DB write.

### `ui/application-form.tsx`
- `'use client'`, mirrors `support/ui/contact-form.tsx`: name, email, social
  link (optional), message fields. Same `input-glass` / `btn-gradient`
  classes. Calls `applyAsAmbassador`.

## Route — `app/[locale]/embajadores/page.tsx`

- `generateMetadata`: indexable (`robots: index/follow`), canonical +
  `alternates.languages` (es/en/x-default), same shape as
  `que-es-athx/page.tsx`.
- Pathnames config (`src/shared/i18n/config.ts`) add:
  ```ts
  '/embajadores': { es: '/embajadores', en: '/ambassadors' },
  ```

## Page sections

Reuses existing patterns (`Reveal`, `glass`, section shells, `hero-*`
classes) — no new visual style:

1. **Hero** — eyebrow + title, short pitch, scroll cue. Lighter than the
   home hero (no phone mockups).
2. **Quiénes somos** — short brand/program framing.
3. **Cómo funciona** — 3-4 step process (apply → review → onboarding →
   start promoting). Placeholder copy.
4. **Criteria** — bullet list of who qualifies. Placeholder copy.
5. **Application form** — `ApplicationForm`, closes the page.
6. Global footer (privacy/terms/cookies) unchanged — no ambassador-specific
   footer.

## i18n

New `ambassadors` namespace in `messages/es.json` and `messages/en.json`,
shaped like `queEsAthx`: `hero.*`, `sections.*`, `form.*` (labels,
placeholders, errors, submit states).

## Testing

- Unit tests: `validators.ts` (pure, all branches) and `apply.ts` (mock
  `email-client`, assert validation-error path and success path).
- No e2e for this page.

## Out of scope

- Per-ambassador `/ambassadors/<slug>` profile/landing pages (DEC-002).
- Payments, separate auth/DB/Stripe (DEC-002).
- Nav/footer/home internal linking to `/embajadores`.

## Dependency graph delta (AGENTS.md)

```
app/[locale]/embajadores/page.tsx ─→ ambassadors.{application.apply, ui.application-form}

src/modules/ambassadors/
├─ domain/validators.ts          (validateName, validateEmail, validateMessage — pure)
├─ infra/email-client.ts         ─→ resend (sendApplicationToAdmin)
├─ application/apply.ts          ─→ ambassadors.{domain.validators, infra.email-client}
└─ ui/application-form.tsx       ─→ ambassadors.application.apply
```
