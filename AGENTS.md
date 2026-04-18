# Communication style — Lean Caveman (MANDATORY)

Lean. Tool-first. Burn few tokens. Tokens expensive & finite. Caveman/baby talk MANDATORY — not optional, not "when convenient". Every reply.

Core:
- Do work. Use tool if tool helps.
- Say result first.
- Stop when done.

Default reply:
- 1-3 lines
- <= 50 tokens unless task needs more
- no preamble, no recap, no praise, no filler, no restate of user ask

Style:
- dense, plain, caveman talk primary
- fragments okay, baby-talk/caveman shortcuts okay if meaning stays clear
- optimize for token count, not fake simplicity
- short words. simple words. grunt-speak when works.

Good examples:
- "Done. File patched."
- "Need path."
- "2 bugs. Null case. Off-by-one."
- "No. Breaks cache."
- "Tool do work. Result: fixed."

Okay shortcuts: u, ctx, req, w/, b/c, min, mem, thru, tho, gonna, gotta, subagent ok, tool now

Avoid:
- unreadable slang
- dropping key facts
- long explanation unless asked
- bullet lists unless shorter
- narrating reasoning
- fancy words

Tool behavior:
- smallest useful tool
- reuse prior result
- do not dump raw tool output
- summarize tool result in 1-2 lines

When blocked:
- one-line blocker
- one short question max
- else best guess and move

Answer shapes:
- verdict: "Yes. Use sidecar only for delta compression."
- fix: "Patched. 3 cuts: smaller schema, minified JSON, local-first recall."
- blocker: "Need repo path."
- compare: "A cheaper. B better. Pick A unless quality pain."

Compression bias:
- keep facts, constraints, decisions, open loops
- drop fluff, repeats, dead ends

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture — DDD bounded contexts (MANDATORY pattern)

All new code follows this. No business logic in `app/` routes. Routes are thin wrappers calling use cases.

```
src/
  shared/
    infra/supabase/        # browser, server, admin clients
    utils/                 # generic helpers (dates, etc.)
  modules/
    <context>/
      domain/              # entities, value objects, validators (pure, no I/O)
      application/         # use cases (one file per use case, 'use server' if action)
      infra/               # repositories (Supabase queries, external APIs)
      ui/                  # context-owned React components (optional)
```

Rules:
- Use case = one file = one exported function. Returns `{ error?: string }` or domain value.
- Repository = data access only. No business rules.
- Domain = pure TS. Importable anywhere.
- `app/` route = parse input → call use case → return response. No DB, no Stripe, no validation logic.
- Cross-context import: only `application/` or `domain/`. Never reach into another context's `infra/`.
- Path aliases: `@/modules/*`, `@/shared/*`. Never `@/lib/*` (deleted).

# Dependency graph (read this before editing — saves grep)

Layer rule: `app → modules.application → modules.{domain,infra} → shared`. Never upward.

```
app/
├─ login/page.tsx                ─→ identity.{sign-in, sign-up} + shared.supabase.client
├─ onboarding/page.tsx           ─→ onboarding.{save-basic-info, save-category, save-fitness-data, complete-onboarding}
│                                  + identity.update-avatar + shared.supabase.client
├─ entrenamiento/page.tsx        ─→ identity.get-current-user + billing.is-user-subscribed
│                                  + training.{get-current-week-workout, cycle.is-free-week}
├─ entrenamiento/subscribe-button.tsx ─→ POST /api/stripe/checkout
├─ perfil/page.tsx               ─→ identity.{get-current-user, sign-out} + billing.get-active-subscription
├─ perfil/portal-button.tsx      ─→ POST /api/stripe/portal
├─ navbar.tsx                    ─→ shared.supabase.server
├─ auth/callback/route.ts        ─→ shared.supabase.server
├─ bienvenida/page.tsx           ─→ (UI only, no deps)
└─ api/stripe/
   ├─ checkout/route.ts          ─→ billing.create-checkout-session
   ├─ portal/route.ts            ─→ billing.create-portal-session
   └─ webhooks/route.ts          ─→ billing.{verify-webhook, handle-stripe-event}

src/modules/
├─ identity/
│  ├─ domain/profile.ts          (Profile, Sex, Category, isCategory)
│  ├─ infra/profile-repository.ts (getProfile, updateProfile)
│  └─ application/
│     ├─ get-current-user.ts     ─→ shared.supabase.server
│     ├─ sign-in.ts              ─→ shared.supabase.server
│     ├─ sign-up.ts              ─→ shared.supabase.server
│     ├─ sign-out.ts             ─→ shared.supabase.server
│     └─ update-avatar.ts        ─→ shared.supabase.server + identity.profile-repository
│
├─ onboarding/
│  ├─ domain/validators.ts       (validateBasicInfo)
│  └─ application/
│     ├─ save-basic-info.ts      ─→ identity.{get-current-user, profile-repository, profile.Sex} + onboarding.validators
│     ├─ save-category.ts        ─→ identity.{get-current-user, profile-repository, profile.isCategory}
│     ├─ save-fitness-data.ts    ─→ identity.{get-current-user, profile-repository, profile.Profile}
│     └─ complete-onboarding.ts  ─→ identity.{get-current-user, profile-repository} + shared.{supabase.server, dates.getWeekStartDate}
│
├─ training/
│  ├─ domain/
│  │  ├─ cycle.ts                ─→ shared.dates.getMondayOf   (getUserCycleWeek, isFreeWeek)
│  │  └─ workout.ts              ─→ identity.profile.Category  (DayWorkout, WeekContent, WorkoutTemplate)
│  ├─ infra/template-repository.ts ─→ shared.supabase.server + training.workout (getTemplate)
│  └─ application/get-current-week-workout.ts
│       ─→ identity.{get-current-user, profile-repository} + training.{cycle, template-repository, workout}
│
└─ billing/
   ├─ infra/
   │  ├─ stripe-client.ts        (Stripe SDK init)
   │  └─ subscription-repository.ts ─→ shared.supabase.{server, admin}
   └─ application/
      ├─ get-subscription-status.ts ─→ billing.subscription-repository
      ├─ create-checkout-session.ts ─→ shared.supabase.server + billing.stripe-client
      ├─ create-portal-session.ts   ─→ shared.supabase.server + billing.stripe-client
      └─ handle-webhook.ts          ─→ shared.supabase.admin + billing.{stripe-client, subscription-repository}

src/shared/
├─ infra/supabase/{client,server,admin}.ts
└─ utils/dates.ts                (getMondayOf, formatLocalDate, getWeekStartDate)
```

DB tables: `profiles`, `subscriptions`, `workout_templates` (unique on category+week_number, 12 rows = 6 weeks × 2 categories).

When adding new code:
1. Pick the bounded context. New context only if truly new domain.
2. Domain types/validators first. Then repo. Then use case. Route last.
3. Update this graph in same commit.
