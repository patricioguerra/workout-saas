# Public Week-1 Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let unregistered visitors see ATHX PRO week-1 training on `/entrenamiento`, with lunes open and other days gated behind an in-place register/login CTA.

**Architecture:** A new `getPreviewWorkout` use case reads the ATHX PRO week-1 template via the service-role admin client (RLS allows only authenticated reads). The `entrenamiento` page's `!user` branch renders the normal training layout with `WeekView` in a new `preview` mode that opens only lunes and swaps locked days for a CTA gate card. A persistent CTA banner sits below the week.

**Tech Stack:** Next.js (App Router, server components), next-intl, Supabase JS, motion/react, Tailwind. No unit-test runner — verification is `npm run lint`, `npm run check:i18n`, `npm run build`, and manual browser checks.

---

## File Structure

- `src/modules/training/infra/template-repository.ts` — add `getPublicTemplate` (admin-client read). Modify.
- `src/modules/training/application/get-preview-workout.ts` — new use case. Create.
- `messages/es.json`, `messages/en.json` — add `entrenamiento.preview.*` keys. Modify.
- `app/[locale]/entrenamiento/week-view.tsx` — add `preview` mode + gate card. Modify.
- `app/[locale]/entrenamiento/page.tsx` — render preview in `!user` branch. Modify.
- `AGENTS.md` — update dependency graph. Modify.

---

## Task 1: Admin-client template read

**Files:**
- Modify: `src/modules/training/infra/template-repository.ts`

- [ ] **Step 1: Add `getPublicTemplate`**

Open `src/modules/training/infra/template-repository.ts`. It currently imports `createSupabaseServerClient`. Add an import for the admin client and a new exported function below the existing `getTemplate`.

Add this import at the top (after the existing server-client import):

```ts
import { createSupabaseAdmin } from '@/shared/infra/supabase/admin'
```

Append this function at the end of the file:

```ts
/**
 * Reads a template via the service-role client, bypassing RLS.
 * Used only for the public (logged-out) week-1 preview, scoped to a single row.
 */
export async function getPublicTemplate(
  category: Category,
  weekNumber: number,
  locale: Locale,
): Promise<WorkoutTemplate | null> {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('category', category)
    .eq('week_number', weekNumber)
    .single()

  if (!data) return null

  const localized = data.content as LocalizedWeekContent
  const content: WeekContent = localized[locale] ?? localized.es!

  return {
    ...(data as Omit<WorkoutTemplate, 'content'>),
    content,
  } as WorkoutTemplate
}
```

Note: `createSupabaseAdmin()` is synchronous (no `await`), unlike `createSupabaseServerClient()`.

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no errors related to this file (unused-import or type errors would show here).

- [ ] **Step 3: Commit**

```bash
git add src/modules/training/infra/template-repository.ts
git commit -m "feat(training): add getPublicTemplate admin-client read"
```

---

## Task 2: Preview use case

**Files:**
- Create: `src/modules/training/application/get-preview-workout.ts`

- [ ] **Step 1: Create the use case**

Create `src/modules/training/application/get-preview-workout.ts` with:

```ts
import { getPublicTemplate } from '../infra/template-repository'
import type { UserWeekWorkout } from '../domain/workout'
import type { Locale } from '@/shared/i18n/config'

/**
 * Public, unauthenticated preview: ATHX PRO, cycle 1, week 1.
 * Returns null if the template row is missing.
 */
export async function getPreviewWorkout(
  locale: Locale,
): Promise<UserWeekWorkout | null> {
  const template = await getPublicTemplate('athx_pro', 1, locale)
  if (!template) return null

  return { ...template, cycle_number: 1, week_number: 1 }
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/training/application/get-preview-workout.ts
git commit -m "feat(training): add getPreviewWorkout use case"
```

---

## Task 3: i18n keys

**Files:**
- Modify: `messages/es.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add `preview` block to ES**

In `messages/es.json`, inside the `entrenamiento` object, add a `preview` key after the existing `ctaUnregistered` block:

```json
    "preview": {
      "lockedTitle": "Desbloquea esta sesión",
      "lockedSubtitle": "El lunes es gratis. Regístrate para ver las 6 semanas completas y seguir tu progreso.",
      "lockedButton": "Regístrate gratis",
      "bannerTitle": "Primera semana gratis",
      "bannerSubtitle": "Crea tu cuenta para desbloquear el plan completo de 6 semanas adaptado a tu categoría.",
      "bannerButton": "Empieza ahora"
    },
```

- [ ] **Step 2: Add `preview` block to EN**

In `messages/en.json`, inside the `entrenamiento` object, add the matching block in the same position:

```json
    "preview": {
      "lockedTitle": "Unlock this session",
      "lockedSubtitle": "Monday is free. Sign up to see all weeks and track your progress.",
      "lockedButton": "Sign up free",
      "bannerTitle": "First week free",
      "bannerSubtitle": "Create your account to unlock the full plan tailored to your category.",
      "bannerButton": "Get started"
    },
```

- [ ] **Step 3: Verify key parity**

Run: `npm run check:i18n`
Expected: exit 0, no key drift reported.

- [ ] **Step 4: Commit**

```bash
git add messages/es.json messages/en.json
git commit -m "feat(i18n): add entrenamiento preview copy"
```

---

## Task 4: WeekView preview mode

**Files:**
- Modify: `app/[locale]/entrenamiento/week-view.tsx`

This task adds a `preview` prop. When `preview` is true: lunes is the only unlocked day, locked day pills show a lock glyph, selecting a locked day renders a gate card instead of the workout, and the lunes day card hides its done-toggle.

- [ ] **Step 1: Import the routing Link**

At the top of `app/[locale]/entrenamiento/week-view.tsx`, after the existing imports, add:

```ts
import { Link } from '@/shared/i18n/routing'
```

- [ ] **Step 2: Add `preview` to Props and the component signature**

Change the `Props` interface to add `preview`:

```ts
interface Props {
  content: WeekContent
  todayKey: DayKey
  cycleNumber: number
  weekNumber: number
  maxes: UserMaxes
  preview?: boolean
}
```

Change the component signature to destructure it (default false):

```ts
export function WeekView({
  content,
  todayKey,
  cycleNumber,
  weekNumber,
  maxes,
  preview = false,
}: Props) {
```

- [ ] **Step 3: Gate the day pills and the active card**

Inside `WeekView`, the unlocked day in preview is always `'lunes'`. Add this constant right after the `const dayContent = content[active]` line:

```ts
  const isLocked = (day: DayKey) => preview && day !== 'lunes'
```

In the day-pill `.map`, compute a `locked` flag and render a lock glyph. Replace the pill `<button>` block (the one with `className={`day-pill ...`}`) with:

```tsx
            <button
              key={day}
              data-day={day}
              onClick={() => setActive(day)}
              className={`day-pill ${isActive ? 'is-active' : ''} ${isToday ? 'is-today' : ''} ${isDone ? 'is-done' : ''} ${isLocked(day) ? 'is-locked' : ''}`}
            >
              <span className="day-pill-label">{getDayShort(day)}</span>
              {isLocked(day) ? (
                <span className="day-pill-check" aria-hidden>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                    <path d="M6 10V8a6 6 0 1 1 12 0v2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <rect x="4" y="10" width="16" height="11" rx="2" fill="currentColor" />
                  </svg>
                </span>
              ) : isDone && (
                <span className="day-pill-check" aria-hidden>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                    <polyline points="5 12 10 17 19 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
```

- [ ] **Step 4: Render the gate card for locked active days**

Inside the `<motion.div key={active} ...>`, the body currently always renders `<DayCard ... />`. Replace that `<DayCard .../>` call with a conditional:

```tsx
          {isLocked(active) ? (
            <GateCard />
          ) : (
            <DayCard
              dayKey={active}
              day={dayContent}
              done={done[active]}
              onToggleDone={() => toggleDone(active)}
              maxes={maxes}
              getDayFull={getDayFull}
              hideToggle={preview}
            />
          )}
```

- [ ] **Step 5: Add `hideToggle` to DayCard**

Update the `DayCard` function signature and props type to accept `hideToggle`:

```tsx
function DayCard({
  dayKey,
  day,
  done,
  onToggleDone,
  maxes,
  getDayFull,
  hideToggle = false,
}: {
  dayKey: DayKey
  day: DayWorkout | undefined
  done: boolean
  onToggleDone: () => void
  maxes: UserMaxes
  getDayFull: (day: DayKey) => string
  hideToggle?: boolean
}) {
```

In the `DayCard` header, wrap the done-toggle `<button>` so it only renders when not hidden. Change `{done ? (...) : (...)}` button to be guarded:

```tsx
        {!hideToggle && (
          <button
            type="button"
            onClick={onToggleDone}
            className={`done-toggle ${done ? 'is-done' : ''}`}
            aria-label={done ? t('day.markUndone') : t('day.markDone')}
          >
            {done ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <polyline points="5 12 10 17 19 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className="text-[10px] uppercase tracking-wider pl-[0.05em]">{t('done')}</span>
            )}
          </button>
        )}
```

- [ ] **Step 6: Add the `GateCard` component**

Add a new component at the bottom of the file (after `DayCard`, before `Section`). It uses existing tokens (`glass`, `hero-cta-primary`) and a blurred faux-teaser. Apply frontend-design quality — purposeful spacing, the existing accent/lock motif, no generic boilerplate.

```tsx
function GateCard() {
  const t = useTranslations('entrenamiento')
  return (
    <article className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className="space-y-3 blur-sm select-none pointer-events-none" aria-hidden>
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
        <div className="h-3 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-2/5 rounded bg-white/10" />
        <div className="h-3 w-3/5 rounded bg-white/10" />
      </div>
      <div className="relative mt-6 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 10V8a6 6 0 1 1 12 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="4" y="10" width="16" height="11" rx="2" fill="currentColor" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{t('preview.lockedTitle')}</h3>
          <p className="text-muted text-sm">{t('preview.lockedSubtitle')}</p>
        </div>
        <Link href="/login" className="hero-cta-primary inline-flex">
          {t('preview.lockedButton')}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </article>
  )
}
```

- [ ] **Step 7: Verify lint passes**

Run: `npm run lint`
Expected: no new errors (watch for unused `Link` or `isToday`/`isDone` scoping).

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/entrenamiento/week-view.tsx
git commit -m "feat(training): add preview mode with gated days to WeekView"
```

---

## Task 5: Render preview in the page

**Files:**
- Modify: `app/[locale]/entrenamiento/page.tsx`

- [ ] **Step 1: Import the preview use case**

Add to the imports at the top of `app/[locale]/entrenamiento/page.tsx`:

```ts
import { getPreviewWorkout } from "@/modules/training/application/get-preview-workout";
```

- [ ] **Step 2: Replace the `!user` branch body**

The current `if (!user) { return ( <section className="train-cta-shell"> ... </section> ); }` becomes: fetch the preview, render the training layout when present, and fall back to the existing CTA shell when null.

Replace the entire `if (!user) { ... }` block with:

```tsx
  // Not registered: show ATHX PRO week-1 preview (lunes open, rest gated)
  if (!user) {
    const preview = await getPreviewWorkout(locale as 'es' | 'en');

    if (!preview) {
      return (
        <section className="train-cta-shell">
          <div className="train-cta-bg" aria-hidden="true">
            <div className="train-cta-image" />
            <div className="train-cta-vignette" />
            <div className="train-cta-grain" />
            <div className="train-cta-fade" />
          </div>

          <div className="train-cta-content">
            <span className="hero-eyebrow">
              <span className="hero-dot" />
              {t('ctaUnregistered.eyebrow')}
            </span>

            <Reveal delay={0.1}>
              <h1 className="train-cta-title">
                {t('ctaUnregistered.title')}
                <br />
                <span className="train-cta-title-accent font-extrabold">
                  {t('ctaUnregistered.title').split('\n')[2]}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="train-cta-sub">
                {t('ctaUnregistered.subtitle')}
              </p>
            </Reveal>

            <Reveal delay={0.3} className="w-full">
              <Link href="/login" className="hero-cta-primary">
                {t('ctaUnregistered.button')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </Reveal>

            <Reveal delay={0.4}>
              <p className="train-cta-fineprint">{t('ctaUnregistered.fineprint')}</p>
            </Reveal>
          </div>
        </section>
      );
    }

    const previewPhase = getCyclePhase(1);

    return (
      <div className="train-page">
        <header className="train-header">
          <div className="train-header-bg" aria-hidden="true">
            <div className="hero-grid" />
            <div className="train-header-fade" />
          </div>
          <div className="train-header-content">
            <div className="train-header-row">
              <span
                className={`badge badge--pill badge--glass phase-${previewPhase.code.toLowerCase()}`}
              >
                <span className="badge-dot phase-chip-dot" />
                ATHX PRO · {t('week.phase')} 1
              </span>
              <WorkoutTimer compact />
            </div>
          </div>
        </header>

        <div className="w-full max-w-md mx-auto px-6 pb-12 -mt-6 relative z-10">
          <WeekView
            content={preview.content}
            todayKey="lunes"
            cycleNumber={1}
            weekNumber={1}
            maxes={{ strictPress: null, backSquat: null, deadlift: null }}
            preview
          />
          <div className="mt-6 glass rounded-xl p-5 text-center space-y-3">
            <p className="text-sm font-semibold">{t('preview.bannerTitle')}</p>
            <p className="text-sm text-muted">{t('preview.bannerSubtitle')}</p>
            <Link
              href="/login"
              className="block w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
            >
              {t('preview.bannerButton')}
            </Link>
          </div>
        </div>
      </div>
    );
  }
```

Note: `getCyclePhase`, `WorkoutTimer`, `WeekView`, `Reveal`, and `Link` are already imported in this file. `locale` is already resolved above the branch.

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors (no unused imports now that the CTA shell is only a fallback).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Manual check**

Run `npm run dev`, open `http://localhost:3000/es/entrenamiento` while logged out. Verify:
- Lunes is selected and shows real ATHX PRO week-1 content, no done-toggle.
- Day pills mar–dom show a lock glyph; clicking one shows the blurred gate card + "Regístrate gratis" → `/login`.
- The bottom banner is visible with "Primera semana gratis".
- `/en/entrenamiento` shows the English copy.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/entrenamiento/page.tsx
git commit -m "feat(training): show public week-1 preview for logged-out visitors"
```

---

## Task 6: Update dependency graph

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the graph**

In `AGENTS.md`, in the `app/` dependency graph, update the `entrenamiento/page.tsx` line to add the preview use case, and in the `training/` module section add the new use case and the admin-client edge. Concretely:

Change:
```
├─ entrenamiento/page.tsx        ─→ identity.get-current-user + billing.get-subscription-status
│                                  + training.{get-current-week-workout, cycle.is-free-week}
```
to add `training.get-preview-workout`:
```
├─ entrenamiento/page.tsx        ─→ identity.get-current-user + billing.get-subscription-status
│                                  + training.{get-week-workout, get-preview-workout, cycle}
```

Under `training/application/`, add a line:
```
│  ├─ get-preview-workout.ts     ─→ training.template-repository.getPublicTemplate (ATHX PRO wk1, no auth)
```

Under `training/infra/template-repository.ts`, note it now also uses `shared.supabase.admin` (getPublicTemplate).

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update dependency graph for public week-1 preview"
```

---

## Self-Review Notes

- Spec coverage: admin-client read (T1), preview use case T2, i18n T3, WeekView preview mode + gate card T4, page render + fallback + banner T5, graph T6. All spec sections covered.
- No DB migration (uses admin client) — matches spec "Out of scope".
- Registered/subscribed/paywall/admin-override logic untouched — only the `!user` branch changes.
- Type names consistent: `getPublicTemplate`, `getPreviewWorkout`, `UserWeekWorkout`, `preview`, `hideToggle`, `isLocked`.
- `createSupabaseAdmin` is the exact exported name (sync, no await).
