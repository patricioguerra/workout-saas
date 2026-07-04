# Commands

- `npm run dev` — local dev (port 3000)
- `npm run build` — prod build
- `npm run lint` — eslint
- `npx supabase ...` — DB CLI (devDep)

# Env vars

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `ADMIN_EMAIL`.
Optional: `NEXT_PUBLIC_GA_ID`, `RESEND_FROM_EMAIL`.

# Git commits

- NEVER add `Co-Authored-By: Claude` (or any AI co-author trailer) to commit messages.
- Conventional commits format. Subject only — no co-author footer.

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
├─ robots.ts                     ─→ shared.seo.site
├─ sitemap.ts                    ─→ shared.seo.site
├─ manifest.ts                   ─→ shared.seo.site
├─ opengraph-image.tsx           (dynamic OG 1200x630, next/og)
├─ twitter-image.tsx             ─→ opengraph-image
├─ icon.tsx                      (dynamic app icon 512×512, next/og)
├─ icon1.tsx                     (dynamic app icon 192×192, next/og — PWA install criteria)
├─ apple-icon.tsx                (dynamic apple-touch-icon 180×180, next/og — iOS home screen)
├─ login/page.tsx                ─→ identity.{sign-in, sign-up} + shared.supabase.client
├─ onboarding/page.tsx           ─→ onboarding.{save-basic-info, save-category, save-fitness-data, complete-onboarding}
│                                  + identity.update-avatar + shared.supabase.client
├─ entrenamiento/page.tsx        ─→ identity.get-current-user + billing.get-subscription-status
│                                  + training.{get-week-workout, get-preview-workout, cycle}
├─ entrenamiento/subscribe-button.tsx ─→ POST /api/stripe/checkout
├─ perfil/page.tsx               ─→ identity.{get-current-user, sign-out} + billing.get-active-subscription
│                                  + components.install-pwa
├─ perfil/portal-button.tsx      ─→ POST /api/stripe/portal
├─ navbar.tsx                    ─→ shared.supabase.server + components.{nav-menu, admin-bell}
├─ components/nav-menu.tsx       ─→ vaul + identity.sign-out
├─ components/admin-bell.tsx     ─→ vaul + components.chat-panel + /api/support/poll
├─ components/chat-bubble-server.tsx ─→ shared.supabase.server + components.chat-bubble
├─ components/chat-bubble.tsx    ─→ vaul + components.chat-panel + /api/support/poll
├─ components/chat-panel.tsx     ─→ support.{send-new-message, reply-to-thread, mark-thread-read, validators}
├─ components/install-pwa.tsx    ─→ vaul  (PWA install: Android beforeinstallprompt + iOS Safari modal; registers /sw.js)
├─ api/support/poll/route.ts     ─→ identity.{get-current-user, get-current-profile}
│                                  + support.{list-user-threads, list-all-threads, get-thread, get-unread-count}
├─ preguntanos/
│  ├─ page.tsx                   ─→ identity.get-current-user + support.{list-user-threads, ui.thread-list}
│  ├─ nuevo/page.tsx             ─→ identity.get-current-user + support.ui.contact-form
│  └─ [id]/page.tsx              ─→ identity.get-current-user + support.{get-thread, ui.message-bubble, ui.reply-form}
├─ admin/mensajes/
│  ├─ page.tsx                   ─→ support.{require-admin, list-all-threads, ui.thread-list}
│  └─ [id]/page.tsx              ─→ support.{require-admin, get-thread, ui.message-bubble, ui.reply-form}
├─ admin/entrenos/
│  ├─ page.tsx                   ─→ support.require-admin
│  ├─ [category]/[week]/page.tsx ─→ support.require-admin + training.get-admin-template
│  │                                + identity.profile.isCategory + entrenos.block-editor
│  └─ block-editor.tsx           ─→ training.{update-template-block, workout-validators}
├─ auth/callback/route.ts        ─→ shared.supabase.server
├─ bienvenida/page.tsx           ─→ motion + components.{reveal, install-pwa}  (post-checkout cinematic tour, install CTA on final step)
├─ que-es-athx/page.tsx          ─→ shared.seo.jsonld
├─ embajadores/page.tsx          ─→ ambassadors.{application.apply, ui.application-form}
├─ privacidad/page.tsx           ─→ (legal, no deps — required by Google OAuth consent)
├─ terminos/page.tsx             ─→ (legal, no deps — required by Google OAuth consent)
├─ layout.tsx (root)             UPDATED: ─→ shared.seo.{site, jsonld} + shared.analytics
├─ page.tsx (home)               UPDATED: ─→ shared.seo.jsonld (Organization/WebSite/SoftwareApplication/FAQ JSON-LD)
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
│  │  ├─ workout.ts              ─→ identity.profile.Category  (DayWorkout, WeekContent, WorkoutTemplate)
│  │  ├─ timer.ts                (TimerConfig, TimerMode, TimerSnapshot, formatMs, modeLabel)
│  │  └─ workout-validators.ts   (validateBlock, BlockKey — pure)
│  ├─ infra/template-repository.ts ─→ shared.supabase.{server, admin} + training.workout (getTemplate, getPublicTemplate; + getRawTemplate, updateTemplateBlock)
│  ├─ application/get-current-week-workout.ts
│  │    ─→ identity.{get-current-user, profile-repository} + training.{cycle, template-repository, workout}
│  ├─ get-preview-workout.ts     ─→ training.template-repository.getPublicTemplate (ATHX PRO wk1, no auth)
│  ├─ application/get-admin-template.ts    ─→ support.require-admin + training.template-repository
│  ├─ application/update-template-block.ts ─→ support.require-admin + training.{workout-validators, template-repository}
│  └─ ui/
│     ├─ timer-audio.ts          (Web Audio beeps + vibrate + wake-lock helpers)
│     ├─ use-timer.ts            ─→ training.domain.timer + training.ui.timer-audio
│     ├─ timer-modal.tsx         ─→ vaul + training.domain.timer
│     └─ workout-timer.tsx       ─→ motion + training.{domain.timer, ui.use-timer, ui.timer-modal}
│
├─ billing/
│  ├─ infra/
│  │  ├─ stripe-client.ts        (Stripe SDK init)
│  │  └─ subscription-repository.ts ─→ shared.supabase.{server, admin}
│  └─ application/
│     ├─ get-subscription-status.ts ─→ billing.subscription-repository
│     ├─ create-checkout-session.ts ─→ shared.supabase.server + billing.stripe-client
│     ├─ create-portal-session.ts   ─→ shared.supabase.server + billing.stripe-client
│     └─ handle-webhook.ts          ─→ shared.supabase.admin + billing.{stripe-client, subscription-repository}
│
├─ support/
│  ├─ domain/
│  │  ├─ thread.ts               (SupportThread, SupportMessage, ThreadStatus, MessageAuthor)
│  │  └─ validators.ts           (validateSubject, validateBody)
│  ├─ infra/
│  │  ├─ thread-repository.ts    ─→ shared.supabase.{server, admin} (CRUD threads + messages)
│  │  └─ email-client.ts         ─→ resend (sendNewMessageToAdmin, sendReplyToUser, sendUserReplyToAdmin)
│  ├─ application/
│  │  ├─ require-admin.ts        ─→ identity.get-current-profile  (requireAdmin, isCurrentUserAdmin)
│  │  ├─ send-new-message.ts     ─→ identity.get-current-user + support.{thread-repo, email-client, validators}
│  │  ├─ reply-to-thread.ts      ─→ identity.{get-current-user, get-current-profile} + support.{thread-repo, email-client, validators}
│  │  ├─ list-user-threads.ts    ─→ identity.get-current-user + support.thread-repo
│  │  ├─ list-all-threads.ts     ─→ support.{require-admin.isCurrentUserAdmin, thread-repo}
│  │  ├─ get-thread.ts           ─→ identity.{get-current-user, get-current-profile} + support.thread-repo
│  │  ├─ mark-thread-read.ts     ─→ identity.{get-current-user, get-current-profile} + shared.supabase.server
│  │  ├─ get-unread-count.ts     ─→ identity.{get-current-user, get-current-profile} + shared.supabase.server
│  │  └─ toggle-thread-status.ts ─→ support.{require-admin, thread-repo}
│  └─ ui/
│     ├─ contact-form.tsx        ─→ support.{send-new-message, validators}
│     ├─ reply-form.tsx          ─→ support.{reply-to-thread, validators}
│     ├─ thread-list.tsx         (list rendering)
│     └─ message-bubble.tsx      ─→ support.domain.thread
│
└─ ambassadors/
   ├─ domain/validators.ts       (validateName, validateEmail, validateMessage — pure)
   ├─ infra/email-client.ts      ─→ resend (sendApplicationToAdmin)
   ├─ application/apply.ts       ─→ ambassadors.{domain.validators, infra.email-client}
   └─ ui/application-form.tsx    ─→ ambassadors.application.apply

src/shared/
├─ infra/supabase/{client,server,admin}.ts
├─ seo/
│  ├─ site.ts                    (SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, locales)
│  └─ jsonld.tsx                 (JsonLd component + organization/webSite/softwareApplication/faqPage builders)
├─ analytics/
│  └─ analytics.tsx              ─→ @vercel/analytics + GA4 via next/script (client component, mounts via root layout)
└─ utils/dates.ts                (getMondayOf, formatLocalDate, getWeekStartDate)
```

DB tables: `profiles` (incl. `is_admin`), `subscriptions`, `workout_templates` (unique on category+week_number, 12 rows = 6 weeks × 2 categories), `support_threads` (incl. `last_read_by_user`, `last_read_by_admin`), `support_messages`.

When adding new code:
1. Pick the bounded context. New context only if truly new domain.
2. Domain types/validators first. Then repo. Then use case. Route last.
3. Update this graph in same commit.
