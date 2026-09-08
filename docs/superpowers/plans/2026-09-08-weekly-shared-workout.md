# Weekly Shared Workout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-user 6-week training cycle with a single shared program, keyed by real calendar week, where every user in a category (ATHX / ATHX PRO) sees the same content — fresh every week, no repeating cycle.

**Architecture:** `workout_templates` gains a `week_start_date` column (Monday of the ISO week, additive migration — nothing existing breaks). A new pure domain function `getCurrentWeekStartDate()` replaces the per-user `getUserCycleWeek`. The free-trial gate becomes "your signup week === the current week" via a new `isFreeWeek(currentWeekStart, signupWeekStart)`. The BASE/BUILD/PEAK/DELOAD phase system is removed — content is authored fresh weekly, no enforced structure. The old `week_number` column and its rows are left untouched as historical data; nothing reads them after cutover.

**Tech Stack:** Next.js (App Router), TypeScript, Supabase (Postgres + PostgREST), `node --test` for unit tests, next-intl for i18n.

**Spec:** `docs/superpowers/specs/2026-09-08-weekly-shared-workout-design.md`

## Global Constraints

- Nothing that current users see today may break before the cutover: the migration is additive only, and no code path is changed to read the new column until the whole vertical slice (Task 3) ships together.
- No cron/automation: content generation stays manual (the user runs it themselves).
- `profiles.cycle_start_date` keeps its exact current meaning ("Monday of signup week") and column name — it is repurposed for the free-trial check only, never renamed or reshaped.
- No new config/anchor table: "current week" is always computed purely from real time, never stored.
- Category split (ATHX / ATHX PRO) is unchanged — this plan does not touch category logic.

---

## Task 1: Additive DB migration — `week_start_date` column

**Files:**
- Create: `supabase/migrations/012_workout_templates_weekly.sql`

**Interfaces:**
- Produces: `workout_templates.week_start_date` (date, nullable), unique on `(category, week_start_date)` where not null. Consumed by Task 3's repository layer.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================
-- Weekly shared workout: add date-keyed template column.
-- Additive only — week_number and its rows are untouched, still readable
-- by the old code path until the cutover in a later deploy.
--
-- The original `week_number between 1 and 6` check (migration 006) was
-- already dropped outside of version control at some point (prod has
-- rows up to week_number 16); this statement regularizes that drift so
-- the migration history matches reality.
-- ============================================

alter table public.workout_templates
  drop constraint if exists workout_templates_week_number_check;

alter table public.workout_templates
  add column week_start_date date;

create unique index if not exists workout_templates_category_week_start_date_key
  on public.workout_templates (category, week_start_date)
  where week_start_date is not null;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase link --project-ref workout-saas` (skip if already linked), then:

```bash
npx supabase db push
```

If the CLI can't reach the DB (no linked DB password available in this environment), open the Supabase Studio SQL editor for the project and paste the contents of `supabase/migrations/012_workout_templates_weekly.sql` directly instead.

- [ ] **Step 3: Verify against prod**

```bash
set -a; source .env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/workout_templates?select=category,week_number,week_start_date&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: a JSON row that now includes a `"week_start_date": null` field (column exists, old rows unaffected, no error).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/012_workout_templates_weekly.sql
git commit -m "feat(db): add week_start_date column for shared weekly templates"
```

---

## Task 2: Domain — add `getCurrentWeekStartDate` and `isValidWeekStartDate`

Purely additive: the existing `getUserCycleWeek`, `isFreeWeek`, `getCyclePhase` and all their call sites are untouched in this task, so the app keeps building and working exactly as before. Task 3 does the full cutover.

**Files:**
- Modify: `src/modules/training/domain/cycle.ts`
- Modify: `src/modules/training/domain/cycle.test.ts`

**Interfaces:**
- Produces: `getCurrentWeekStartDate(): string` (e.g. `"2026-09-14"`, always a Monday, computed from real time). `isValidWeekStartDate(value: string): boolean`. Consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Append to `src/modules/training/domain/cycle.test.ts` (keep all existing tests as-is, add below them):

```ts
import { getCurrentWeekStartDate, isValidWeekStartDate } from './cycle'

const aMonday = formatLocalDate(getMondayOf(new Date()))
const dayAfterMonday = (() => {
  const [y, m, d] = aMonday.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + 1)
  return formatLocalDate(date)
})()

test('getCurrentWeekStartDate matches the Madrid Sun-22:00 boundary', () => {
  assert.equal(getCurrentWeekStartDate(), madridTodayMonday())
})

test('getCurrentWeekStartDate returns a Monday in YYYY-MM-DD format', () => {
  const value = getCurrentWeekStartDate()
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/)
  const [y, m, d] = value.split('-').map(Number)
  assert.equal(new Date(y, m - 1, d).getDay(), 1)
})

test('isValidWeekStartDate: true for an actual Monday', () => {
  assert.equal(isValidWeekStartDate(aMonday), true)
})

test('isValidWeekStartDate: false for a non-Monday date', () => {
  assert.equal(isValidWeekStartDate(dayAfterMonday), false)
})

test('isValidWeekStartDate: false for a malformed string', () => {
  assert.equal(isValidWeekStartDate('not-a-date'), false)
})

test('isValidWeekStartDate: false for an invalid calendar date', () => {
  assert.equal(isValidWeekStartDate('2026-02-30'), false)
})
```

Note: `madridTodayMonday()` already exists at the top of this test file — reuse it as-is, don't redefine it.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/modules/training/domain/cycle.test.ts`
Expected: FAIL — `getCurrentWeekStartDate` and `isValidWeekStartDate` are not exported from `./cycle`.

- [ ] **Step 3: Implement the new functions**

Add to `src/modules/training/domain/cycle.ts` (append after the existing `isFreeWeek` function, before `PhaseCode`):

```ts
/**
 * Current program week, shared by everyone — not per-user. Rolls over
 * Sun 22:00 Madrid (Mon 00:00 − 2h); toLocaleString respects DST so the
 * shift is exact year-round.
 */
export function getCurrentWeekStartDate(): string {
  const SHIFT_MS = 2 * 60 * 60 * 1000
  const nowMadrid = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  )
  return formatLocalDate(getMondayOf(new Date(nowMadrid.getTime() + SHIFT_MS)))
}

/** True only for a real calendar date string that falls on a Monday. */
export function isValidWeekStartDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return false
  }
  return formatLocalDate(getMondayOf(date)) === value
}
```

Add `formatLocalDate` to the existing import line at the top of the file:

```ts
import { getMondayOf, formatLocalDate } from '@/shared/utils/dates'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/modules/training/domain/cycle.test.ts`
Expected: PASS, all tests (old and new) green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/training/domain/cycle.ts src/modules/training/domain/cycle.test.ts
git commit -m "feat(training): add global current-week and week-date validation helpers"
```

---

## Task 3: Cut over — date-keyed templates end to end

This is one task, not several, because it is a single breaking rename (`week_number: number` → `week_start_date: string`, `cycle_number` removed) that touches domain, infra, application and UI simultaneously — the program does not type-check in any intermediate state, so there is no meaningful place to split it into independently-reviewable pieces. Steps are ordered bottom-up (domain → infra → application → routes/components) so each edit builds on the last; the task's own test cycle is the final full build + manual walkthrough.

**Files:**
- Modify: `src/modules/training/domain/cycle.ts`
- Modify: `src/modules/training/domain/cycle.test.ts`
- Modify: `src/modules/training/domain/workout.ts`
- Modify: `src/modules/training/infra/template-repository.ts`
- Modify: `src/modules/training/application/get-week-workout.ts`
- Delete: `src/modules/training/application/get-current-week-workout.ts`
- Modify: `src/modules/training/application/get-preview-workout.ts`
- Modify: `src/modules/training/application/get-admin-template.ts`
- Delete: `src/modules/training/application/get-admin-week-numbers.ts`
- Create: `src/modules/training/application/get-admin-weeks.ts`
- Modify: `src/modules/training/application/update-template-block.ts`
- Modify: `app/[locale]/admin/entrenos/page.tsx`
- Modify: `app/[locale]/admin/entrenos/[category]/[week]/page.tsx`
- Modify: `app/[locale]/admin/entrenos/block-editor.tsx`
- Modify: `app/[locale]/entrenamiento/page.tsx`
- Modify: `app/[locale]/entrenamiento/week-view.tsx`
- Modify: `app/[locale]/entrenamiento/admin-week-badge.tsx`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `getCurrentWeekStartDate()`, `isValidWeekStartDate(value)` from Task 2.
- Produces: `WorkoutTemplate.week_start_date: string` (replaces `week_number`), `UserWeekWorkout = WorkoutTemplate` (no more `cycle_number`), `isFreeWeek(currentWeekStart: string, signupWeekStart: string | null): boolean` (replaces the old `{cycleNumber, weekNumber}`-shaped one), `getTemplate(category, weekStartDate, locale)`, `getWeekWorkout(locale, weekStartDateOverride?, categoryOverride?)`, `getAdminWeeks(category): Promise<string[]>`.

- [ ] **Step 1: `cycle.ts` — remove the old per-user cycle system**

Replace the whole file content of `src/modules/training/domain/cycle.ts` with:

```ts
import { getMondayOf, formatLocalDate } from '@/shared/utils/dates'

/**
 * Current program week, shared by everyone — not per-user. Rolls over
 * Sun 22:00 Madrid (Mon 00:00 − 2h); toLocaleString respects DST so the
 * shift is exact year-round.
 */
export function getCurrentWeekStartDate(): string {
  const SHIFT_MS = 2 * 60 * 60 * 1000
  const nowMadrid = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  )
  return formatLocalDate(getMondayOf(new Date(nowMadrid.getTime() + SHIFT_MS)))
}

/** True only for a real calendar date string that falls on a Monday. */
export function isValidWeekStartDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return false
  }
  return formatLocalDate(getMondayOf(date)) === value
}

/**
 * Free trial: the current week is free only for the user who signed up
 * during that same week. `signupWeekStart` is `profiles.cycle_start_date`
 * (Monday of the user's signup week).
 */
export function isFreeWeek(currentWeekStart: string, signupWeekStart: string | null): boolean {
  return signupWeekStart !== null && signupWeekStart === currentWeekStart
}
```

This removes `getUserCycleWeek`, the old `isFreeWeek`, `getCyclePhase`, `PhaseCode`, `CyclePhase`, `UserCycleWeek`, and `WEEKS_PER_CYCLE`.

- [ ] **Step 2: `cycle.test.ts` — replace phase/cycle tests with `isFreeWeek` tests**

Replace the whole file content of `src/modules/training/domain/cycle.test.ts` with:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getCurrentWeekStartDate, isFreeWeek, isValidWeekStartDate } from './cycle'
import { getMondayOf, formatLocalDate } from '../../../shared/utils/dates'

function madridTodayMonday(): string {
  const SHIFT_MS = 2 * 60 * 60 * 1000
  const nowMadrid = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  )
  return formatLocalDate(getMondayOf(new Date(nowMadrid.getTime() + SHIFT_MS)))
}

const aMonday = formatLocalDate(getMondayOf(new Date()))
const dayAfterMonday = (() => {
  const [y, m, d] = aMonday.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + 1)
  return formatLocalDate(date)
})()

test('getCurrentWeekStartDate matches the Madrid Sun-22:00 boundary', () => {
  assert.equal(getCurrentWeekStartDate(), madridTodayMonday())
})

test('getCurrentWeekStartDate returns a Monday in YYYY-MM-DD format', () => {
  const value = getCurrentWeekStartDate()
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/)
  const [y, m, d] = value.split('-').map(Number)
  assert.equal(new Date(y, m - 1, d).getDay(), 1)
})

test('isFreeWeek: true when signup week matches current week', () => {
  assert.equal(isFreeWeek(aMonday, aMonday), true)
})

test('isFreeWeek: false when signup week differs from current week', () => {
  assert.equal(isFreeWeek(aMonday, dayAfterMonday), false)
})

test('isFreeWeek: false when user has no signup week recorded', () => {
  assert.equal(isFreeWeek(aMonday, null), false)
})

test('isValidWeekStartDate: true for an actual Monday', () => {
  assert.equal(isValidWeekStartDate(aMonday), true)
})

test('isValidWeekStartDate: false for a non-Monday date', () => {
  assert.equal(isValidWeekStartDate(dayAfterMonday), false)
})

test('isValidWeekStartDate: false for a malformed string', () => {
  assert.equal(isValidWeekStartDate('not-a-date'), false)
})

test('isValidWeekStartDate: false for an invalid calendar date', () => {
  assert.equal(isValidWeekStartDate('2026-02-30'), false)
})
```

Run: `npm test -- src/modules/training/domain/cycle.test.ts`
Expected: PASS, 9 tests green.

- [ ] **Step 3: `workout.ts` — rename the key field, drop `cycle_number`**

In `src/modules/training/domain/workout.ts`, replace:

```ts
export interface WorkoutTemplate {
  id: string
  category: Category
  week_number: number
  content: WeekContent
  model_version: string | null
  created_at: string
  updated_at: string
}

export interface UserWeekWorkout extends WorkoutTemplate {
  cycle_number: number
}
```

with:

```ts
export interface WorkoutTemplate {
  id: string
  category: Category
  week_start_date: string
  content: WeekContent
  model_version: string | null
  created_at: string
  updated_at: string
}

export type UserWeekWorkout = WorkoutTemplate
```

- [ ] **Step 4: `template-repository.ts` — query by `week_start_date`**

Replace the whole file content of `src/modules/training/infra/template-repository.ts` with:

```ts
import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import { createSupabaseAdmin } from '@/shared/infra/supabase/admin'
import type { Category } from '@/modules/identity/domain/profile'
import type { WorkoutTemplate, WeekContent, LocalizedWeekContent } from '../domain/workout'
import type { BlockKey } from '../domain/workout-validators'
import type { Locale } from '@/shared/i18n/config'

export async function getTemplate(
  category: Category,
  weekStartDate: string,
  locale: Locale,
): Promise<WorkoutTemplate | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('category', category)
    .eq('week_start_date', weekStartDate)
    .single()

  if (!data) return null

  const localized = data.content as LocalizedWeekContent
  const content: WeekContent = localized[locale] ?? localized.es!

  return {
    ...(data as Omit<WorkoutTemplate, 'content'>),
    content,
  } as WorkoutTemplate
}

/**
 * Reads a template via the service-role client, bypassing RLS.
 * Used only for the public (logged-out) preview, scoped to a single row.
 */
export async function getPublicTemplate(
  category: Category,
  weekStartDate: string,
  locale: Locale,
): Promise<WorkoutTemplate | null> {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('category', category)
    .eq('week_start_date', weekStartDate)
    .single()

  if (!data) return null

  const localized = data.content as LocalizedWeekContent
  const content: WeekContent = localized[locale] ?? localized.es!

  return {
    ...(data as Omit<WorkoutTemplate, 'content'>),
    content,
  } as WorkoutTemplate
}

/**
 * Returns the full localized content (both languages) for the admin editor.
 * Service-role client — gated by requireAdmin in the use case.
 */
export async function getRawTemplate(
  category: Category,
  weekStartDate: string,
): Promise<LocalizedWeekContent | null> {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from('workout_templates')
    .select('content')
    .eq('category', category)
    .eq('week_start_date', weekStartDate)
    .single()

  if (!data) return null
  return data.content as LocalizedWeekContent
}

/**
 * Lists the week_start_date values that actually have a template row for
 * this category, ascending. Drives the admin week picker.
 * Service-role client — gated by requireAdmin in the use case.
 */
export async function getWeekStartDatesForCategory(category: Category): Promise<string[]> {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from('workout_templates')
    .select('week_start_date')
    .eq('category', category)
    .not('week_start_date', 'is', null)
    .order('week_start_date', { ascending: true })

  return (data ?? []).map((row) => row.week_start_date as string)
}

/** Scalar blocks: always written as-is (never removed), since `titulo` is required. */
const STRING_BLOCKS: BlockKey[] = ['titulo', 'recuperacion']

/**
 * Merges a single block into one day, for each provided locale, leaving every
 * other day/block/locale untouched. For array/object blocks an empty value
 * removes the block. Returns an error (rather than silently dropping) if a
 * non-empty value targets a locale/day that isn't seeded — we never create a
 * partial locale week, since that would shadow the ES fallback. Service-role
 * client — gated by requireAdmin in the use case.
 */
export async function updateTemplateBlock(
  category: Category,
  weekStartDate: string,
  day: keyof WeekContent,
  blockKey: BlockKey,
  byLocale: Partial<Record<Locale, unknown>>,
): Promise<{ error?: string }> {
  const supabase = createSupabaseAdmin()
  const { data, error: readErr } = await supabase
    .from('workout_templates')
    .select('content')
    .eq('category', category)
    .eq('week_start_date', weekStartDate)
    .single()

  if (readErr || !data) return { error: 'Plantilla no encontrada' }

  const content = data.content as LocalizedWeekContent

  const isStringBlock = STRING_BLOCKS.includes(blockKey)

  for (const [locale, value] of Object.entries(byLocale) as [Locale, unknown][]) {
    const empty =
      !isStringBlock &&
      (value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0))

    const week = content[locale]
    if (!week) {
      if (empty) continue
      return { error: `El idioma "${locale}" no está sembrado en esta plantilla` }
    }
    const dayWorkout = week[day] as unknown as Record<string, unknown> | undefined
    if (!dayWorkout) {
      if (empty) continue
      return { error: `El día "${day}" no existe en "${locale}"` }
    }

    if (empty) {
      delete dayWorkout[blockKey]
    } else {
      dayWorkout[blockKey] = value
    }
  }

  const { error: writeErr } = await supabase
    .from('workout_templates')
    .update({ content })
    .eq('category', category)
    .eq('week_start_date', weekStartDate)

  if (writeErr) return { error: writeErr.message }
  return {}
}
```

- [ ] **Step 5: `get-week-workout.ts` — global current week, override by date**

Replace the whole file content of `src/modules/training/application/get-week-workout.ts` with:

```ts
import { getCurrentUser } from '@/modules/identity/application/get-current-user'
import { getProfile } from '@/modules/identity/infra/profile-repository'
import { getCurrentWeekStartDate } from '../domain/cycle'
import { getTemplate } from '../infra/template-repository'
import type { UserWeekWorkout } from '../domain/workout'
import type { Locale } from '@/shared/i18n/config'
import type { Category } from '@/modules/identity/domain/profile'

export async function getWeekWorkout(
  locale: Locale,
  weekStartDateOverride?: string,
  categoryOverride?: Category,
): Promise<UserWeekWorkout | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getProfile(user.id)
  if (!profile?.category) return null

  const effectiveWeekStart = weekStartDateOverride ?? getCurrentWeekStartDate()
  const effectiveCategory = categoryOverride ?? profile.category

  return getTemplate(effectiveCategory, effectiveWeekStart, locale)
}
```

(`getUserCycleWeek`'s old null-check on `profile.cycle_start_date` is dropped here — that field no longer decides which content loads, only whether it's free, which is checked separately by the page.)

- [ ] **Step 6: Delete the redundant use case**

```bash
git rm src/modules/training/application/get-current-week-workout.ts
```

(Unused variant of Step 5's use case — was already dead code, doubly so now that `getWeekWorkout` covers the same job.)

- [ ] **Step 7: `get-preview-workout.ts` — show the current week, not week 1**

Replace the whole file content of `src/modules/training/application/get-preview-workout.ts` with:

```ts
import { getCurrentWeekStartDate } from '../domain/cycle'
import { getPublicTemplate } from '../infra/template-repository'
import type { UserWeekWorkout } from '../domain/workout'
import type { Locale } from '@/shared/i18n/config'

/**
 * Public, unauthenticated preview: ATHX PRO, current week.
 * Returns null if the template row is missing.
 */
export async function getPreviewWorkout(
  locale: Locale,
): Promise<UserWeekWorkout | null> {
  return getPublicTemplate('athx_pro', getCurrentWeekStartDate(), locale)
}
```

- [ ] **Step 8: `get-admin-template.ts` — param rename**

In `src/modules/training/application/get-admin-template.ts`, replace:

```ts
export async function getAdminTemplate(
  category: Category,
  weekNumber: number,
): Promise<LocalizedWeekContent | null> {
  await requireAdmin()
  return getRawTemplate(category, weekNumber)
}
```

with:

```ts
export async function getAdminTemplate(
  category: Category,
  weekStartDate: string,
): Promise<LocalizedWeekContent | null> {
  await requireAdmin()
  return getRawTemplate(category, weekStartDate)
}
```

- [ ] **Step 9: Rename `get-admin-week-numbers.ts` → `get-admin-weeks.ts`**

```bash
git rm src/modules/training/application/get-admin-week-numbers.ts
```

Create `src/modules/training/application/get-admin-weeks.ts`:

```ts
import { requireAdmin } from '@/modules/support/application/require-admin'
import { getWeekStartDatesForCategory } from '../infra/template-repository'
import type { Category } from '@/modules/identity/domain/profile'

export async function getAdminWeeks(category: Category): Promise<string[]> {
  await requireAdmin()
  return getWeekStartDatesForCategory(category)
}
```

- [ ] **Step 10: `update-template-block.ts` — param rename**

In `src/modules/training/application/update-template-block.ts`, replace:

```ts
export async function updateTemplateBlockAction(
  category: Category,
  weekNumber: number,
  day: keyof WeekContent,
  blockKey: BlockKey,
  byLocale: Partial<Record<Locale, unknown>>,
): Promise<{ error?: string }> {
  await requireAdmin()

  for (const value of Object.values(byLocale)) {
    const { error } = validateBlock(blockKey, value)
    if (error) return { error }
  }

  const result = await updateTemplateBlock(category, weekNumber, day, blockKey, byLocale)
  if (result.error) return result

  revalidatePath('/[locale]/admin/entrenos/[category]/[week]', 'page')
  revalidatePath('/[locale]/entrenamiento', 'page')
  return {}
}
```

with:

```ts
export async function updateTemplateBlockAction(
  category: Category,
  weekStartDate: string,
  day: keyof WeekContent,
  blockKey: BlockKey,
  byLocale: Partial<Record<Locale, unknown>>,
): Promise<{ error?: string }> {
  await requireAdmin()

  for (const value of Object.values(byLocale)) {
    const { error } = validateBlock(blockKey, value)
    if (error) return { error }
  }

  const result = await updateTemplateBlock(category, weekStartDate, day, blockKey, byLocale)
  if (result.error) return result

  revalidatePath('/[locale]/admin/entrenos/[category]/[week]', 'page')
  revalidatePath('/[locale]/entrenamiento', 'page')
  return {}
}
```

- [ ] **Step 11: Admin list page — list dates, not numbers**

Replace the whole file content of `app/[locale]/admin/entrenos/page.tsx` with:

```tsx
import { requireAdmin } from '@/modules/support/application/require-admin'
import { getAdminWeeks } from '@/modules/training/application/get-admin-weeks'
import { Link } from '@/shared/i18n/routing'

const CATEGORIES: { key: 'athx' | 'athx_pro'; label: string }[] = [
  { key: 'athx', label: 'ATHX' },
  { key: 'athx_pro', label: 'ATHX PRO' },
]

export default async function AdminEntrenosPage() {
  await requireAdmin()

  const weeksByCategory = await Promise.all(
    CATEGORIES.map((cat) => getAdminWeeks(cat.key))
  )

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Editor de entrenos</h1>
      {CATEGORIES.map((cat, i) => (
        <div key={cat.key} className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{cat.label}</h2>
          <div className="grid grid-cols-3 gap-3">
            {weeksByCategory[i].map((weekStartDate) => (
              <Link
                key={weekStartDate}
                href={{
                  pathname: '/admin/entrenos/[category]/[week]',
                  params: { category: cat.key, week: weekStartDate },
                }}
                className="glass rounded-xl p-4 text-center hover:opacity-80"
              >
                Semana {weekStartDate}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 12: Admin editor page — validate a date, not an int**

Replace the whole file content of `app/[locale]/admin/entrenos/[category]/[week]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/modules/support/application/require-admin'
import { getAdminTemplate } from '@/modules/training/application/get-admin-template'
import { isCategory } from '@/modules/identity/domain/profile'
import { isValidWeekStartDate } from '@/modules/training/domain/cycle'
import type { WeekContent } from '@/modules/training/domain/workout'
import type { BlockKey } from '@/modules/training/domain/workout-validators'
import { BlockEditor } from '../../block-editor'

const DAYS: (keyof WeekContent)[] = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
]
const BLOCKS: BlockKey[] = ['titulo', 'warmup', 'fuerza', 'wod', 'recuperacion']

export default async function Page({
  params,
}: {
  params: Promise<{ category: string; week: string }>
}) {
  await requireAdmin()
  const { category, week } = await params

  if (!isCategory(category)) notFound()
  if (!isValidWeekStartDate(week)) notFound()

  const content = await getAdminTemplate(category, week)
  if (!content) notFound()

  const es = content.es
  const en = content.en

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">
        {category === 'athx_pro' ? 'ATHX PRO' : 'ATHX'} · Semana {week}
      </h1>
      {DAYS.map((day) => {
        const esDay = es?.[day] as Record<string, unknown> | undefined
        const enDay = en?.[day] as Record<string, unknown> | undefined
        return (
          <section key={day} className="mb-8 glass rounded-xl p-4">
            <h2 className="text-lg font-semibold capitalize mb-3">{day}</h2>
            {BLOCKS.map((blockKey) => (
              <BlockEditor
                key={blockKey}
                category={category}
                week={week}
                day={day}
                blockKey={blockKey}
                valueEs={esDay?.[blockKey] ?? null}
                valueEn={enDay?.[blockKey] ?? null}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 13: `block-editor.tsx` — `week` prop becomes a date string**

In `app/[locale]/admin/entrenos/block-editor.tsx`, replace:

```ts
interface Props {
  category: 'athx' | 'athx_pro'
  week: number
  day: keyof WeekContent
  blockKey: BlockKey
  valueEs: unknown
  valueEn: unknown
}
```

with:

```ts
interface Props {
  category: 'athx' | 'athx_pro'
  week: string
  day: keyof WeekContent
  blockKey: BlockKey
  valueEs: unknown
  valueEn: unknown
}
```

No other change needed in this file — `week` is only ever passed straight through to `updateTemplateBlockAction`, never parsed as a number.

- [ ] **Step 14: `admin-week-badge.tsx` — drop phases, show a date**

Replace the whole file content of `app/[locale]/entrenamiento/admin-week-badge.tsx` with:

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useFormatter } from 'next-intl'

interface Props {
  category: 'athx' | 'athx_pro'
  weekStartDate: string
  weekStartDates: string[]
  weekLabel: string
}

export function AdminWeekBadge({ category, weekStartDate, weekStartDates, weekLabel }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const format = useFormatter()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.replace(`?${params.toString()}`)
  }

  const categoryLabel = category === 'athx_pro' ? 'ATHX PRO' : 'ATHX'
  const formatDate = (value: string) => format.dateTime(new Date(`${value}T00:00:00`), { day: '2-digit', month: '2-digit' })

  return (
    <span className="inline-flex items-center gap-2">
      <span className="badge badge--pill badge--glass relative cursor-pointer select-none">
        {categoryLabel} ▾
        <select
          value={category}
          onChange={(e) => setParam('cat', e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          aria-label="Seleccionar categoría"
        >
          <option value="athx">ATHX</option>
          <option value="athx_pro">ATHX PRO</option>
        </select>
      </span>
      <span className="badge badge--pill badge--glass relative cursor-pointer select-none">
        {weekLabel} {formatDate(weekStartDate)} ▾
        <select
          value={weekStartDate}
          onChange={(e) => setParam('week', e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          aria-label="Seleccionar semana"
        >
          {weekStartDates.map((w) => (
            <option key={w} value={w}>
              {weekLabel} {formatDate(w)}
            </option>
          ))}
        </select>
      </span>
    </span>
  )
}
```

- [ ] **Step 15: `week-view.tsx` — one date prop instead of two numbers**

In `app/[locale]/entrenamiento/week-view.tsx`, replace:

```ts
interface Props {
  content: WeekContent
  todayKey: DayKey
  cycleNumber: number
  weekNumber: number
  maxes: UserMaxes
  preview?: boolean
}

export function WeekView({
  content,
  todayKey,
  cycleNumber,
  weekNumber,
  maxes,
  preview = false,
}: Props) {
```

with:

```ts
interface Props {
  content: WeekContent
  todayKey: DayKey
  weekStartDate: string
  maxes: UserMaxes
  preview?: boolean
}

export function WeekView({
  content,
  todayKey,
  weekStartDate,
  maxes,
  preview = false,
}: Props) {
```

And replace:

```ts
  const storageKey = `done:c${cycleNumber}:w${weekNumber}`
```

with:

```ts
  const storageKey = `done:w${weekStartDate}`
```

- [ ] **Step 16: `entrenamiento/page.tsx` — wire the global current week through**

In `app/[locale]/entrenamiento/page.tsx`:

Replace the top-of-file import:

```ts
import { getTranslations, getLocale } from "next-intl/server";
```

with:

```ts
import { getTranslations, getLocale, getFormatter } from "next-intl/server";
```

Replace the import block:

```ts
import {
  isFreeWeek as isFreeCycleWeek,
  getCyclePhase,
} from "@/modules/training/domain/cycle";
```

with:

```ts
import { getCurrentWeekStartDate, isFreeWeek } from "@/modules/training/domain/cycle";
```

Replace the unauthenticated preview block (the section rendering `previewPhase` and the `WeekView` call with `cycleNumber={1} weekNumber={1}`):

```ts
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
```

with:

```ts
    return (
      <div className="train-page">
        <header className="train-header">
          <div className="train-header-bg" aria-hidden="true">
            <div className="hero-grid" />
            <div className="train-header-fade" />
          </div>
          <div className="train-header-content">
            <div className="train-header-row">
              <span className="badge badge--pill badge--glass">
                ATHX PRO
              </span>
              <WorkoutTimer compact />
            </div>
          </div>
        </header>

        <div className="w-full max-w-md mx-auto px-6 pb-12 -mt-6 relative z-10">
          <WeekView
            content={preview.content}
            todayKey="lunes"
            weekStartDate={preview.week_start_date}
            maxes={{ strictPress: null, backSquat: null, deadlift: null }}
            preview
          />
```

Replace the admin-override block:

```ts
  const resolvedParams = await searchParams;
  const profile = await getCurrentProfile();
  const isAdmin = profile?.is_admin ?? false;
  const adminWeekOverride = isAdmin
    ? (resolvedParams?.week ? parseInt(resolvedParams.week) : 1)
    : undefined;
  const adminCategoryOverride =
    isAdmin && (resolvedParams?.cat === 'athx' || resolvedParams?.cat === 'athx_pro')
      ? resolvedParams.cat
      : undefined;
  const effectiveCategory = adminCategoryOverride ?? profile?.category;
  const badgeCategory = effectiveCategory === "athx_pro" ? "athx_pro" : "athx";

  const [subscribed, workout, adminWeekNumbers] = await Promise.all([
    isUserSubscribed(user.id),
    getWeekWorkout(locale as 'es' | 'en', adminWeekOverride, adminCategoryOverride),
    isAdmin ? getAdminWeekNumbers(badgeCategory) : Promise.resolve([]),
  ]);
```

with:

```ts
  const resolvedParams = await searchParams;
  const profile = await getCurrentProfile();
  const isAdmin = profile?.is_admin ?? false;
  const currentWeekStart = getCurrentWeekStartDate();
  const adminWeekOverride = isAdmin ? resolvedParams?.week : undefined;
  const adminCategoryOverride =
    isAdmin && (resolvedParams?.cat === 'athx' || resolvedParams?.cat === 'athx_pro')
      ? resolvedParams.cat
      : undefined;
  const effectiveCategory = adminCategoryOverride ?? profile?.category;
  const badgeCategory = effectiveCategory === "athx_pro" ? "athx_pro" : "athx";

  const [subscribed, workout, adminWeeks] = await Promise.all([
    isUserSubscribed(user.id),
    getWeekWorkout(locale as 'es' | 'en', adminWeekOverride, adminCategoryOverride),
    isAdmin ? getAdminWeeks(badgeCategory) : Promise.resolve([]),
  ]);
```

Also update the import of `getAdminWeekNumbers`:

```ts
import { getAdminWeekNumbers } from "@/modules/training/application/get-admin-week-numbers";
```

becomes

```ts
import { getAdminWeeks } from "@/modules/training/application/get-admin-weeks";
```

Replace the paywall-gate and rendering block:

```ts
  const cycleNumber = workout.cycle_number;
  const weekNumber = workout.week_number;

  const isBlocked =
    !subscribed && !isFreeCycleWeek({ cycleNumber, weekNumber });
```

with:

```ts
  const weekStartDate = workout.week_start_date;

  const isBlocked =
    !subscribed && !isFreeWeek(currentWeekStart, profile?.cycle_start_date ?? null);
```

Replace:

```ts
  const phase = getCyclePhase(weekNumber);
  const todayKey = DAY_KEYS[new Date().getDay()];
```

with:

```ts
  const format = await getFormatter();
  const weekLabel = format.dateTime(new Date(`${weekStartDate}T00:00:00`), { day: '2-digit', month: '2-digit' });
  const todayKey = DAY_KEYS[new Date().getDay()];
```

Replace the header badge block:

```ts
            {isAdmin ? (
              <AdminWeekBadge
                category={badgeCategory}
                weekNumber={weekNumber}
                weekNumbers={adminWeekNumbers}
                phaseLabel={t('week.phase')}
              />
            ) : (
              <span
                className={`badge badge--pill badge--glass phase-${phase.code.toLowerCase()}`}
              >
                <span className="badge-dot phase-chip-dot" />
                {profile?.category === "athx_pro" ? "ATHX PRO" : "ATHX"} · {t('week.phase')}{" "}
                {weekNumber}
              </span>
            )}
```

with:

```ts
            {isAdmin ? (
              <AdminWeekBadge
                category={badgeCategory}
                weekStartDate={weekStartDate}
                weekStartDates={adminWeeks}
                weekLabel={t('week.phase')}
              />
            ) : (
              <span className="badge badge--pill badge--glass">
                {profile?.category === "athx_pro" ? "ATHX PRO" : "ATHX"} · {t('week.phase')}{" "}
                {weekLabel}
              </span>
            )}
```

Finally, replace the `WeekView` call at the bottom:

```ts
        <WeekView
          content={workout.content}
          todayKey={todayKey}
          cycleNumber={cycleNumber}
          weekNumber={weekNumber}
          maxes={maxes}
        />
```

with:

```ts
        <WeekView
          content={workout.content}
          todayKey={todayKey}
          weekStartDate={weekStartDate}
          maxes={maxes}
        />
```

- [ ] **Step 17: Full build check**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors. If any remaining reference to `week_number`, `cycle_number`, `getCyclePhase`, `getUserCycleWeek`, or `getAdminWeekNumbers` is reported, fix it — the search below must return nothing outside `supabase/migrations/`:

```bash
grep -rn "getCyclePhase\|getUserCycleWeek\|getAdminWeekNumbers\|cycle_number" app src
```

- [ ] **Step 18: Run the full test suite**

Run: `npm test`
Expected: PASS, all tests green (cycle.test.ts + workout-validators.test.ts + the other 3 existing test files, untouched by this task).

- [ ] **Step 19: Manual verification**

With `npm run dev` running:
1. Visit `/entrenamiento` logged out → preview renders ATHX PRO for the current week (no phase badge, just "ATHX PRO").
2. Log in as an admin, visit `/admin/entrenos` → both categories list their available weeks as dates (e.g. "Semana 2026-09-14").
3. Open one week's editor, edit a block, save → confirm it persists (page reload shows the edit) and no error.
4. Log in as a non-admin subscribed user whose category has a row for the current week → `/entrenamiento` renders that week's content, badge shows "{ATHX|ATHX PRO} · Semana {dd/mm}".
5. Temporarily (in Supabase Studio) set a test user's `cycle_start_date` to the current week's Monday and remove their subscription → confirm the current week renders unblocked (free trial). Set it to a different Monday → confirm the paywall shows.
6. Delete the current week's row for one category (or test against a category with no current-week row) → confirm `/entrenamiento` shows the existing "content is on its way" empty state (`t('subtitle')`) instead of crashing.

- [ ] **Step 20: Update the architecture graph**

In `AGENTS.md`, under the `training/` section of the dependency graph, update:
- `cycle.ts` line to read: `─→ shared.dates.getMondayOf   (getCurrentWeekStartDate, isValidWeekStartDate, isFreeWeek)`
- Remove the `get-current-week-workout.ts` line entirely.
- Rename the `get-admin-week-numbers.ts` line to `get-admin-weeks.ts` (same deps).
- Note under `get-week-workout.ts` that it now takes `(locale, weekStartDateOverride?, categoryOverride?)`.

- [ ] **Step 21: Commit**

```bash
git add -A
git commit -m "feat(training): switch weekly templates to shared calendar-week key"
```

---

## Task 4: Rollout (manual, no code)

Not a code task — this is the launch checklist for cutting real users over. Do this only after Task 3 is merged and deployed to production with the current behavior unchanged (Task 3's deploy is safe on its own: the moment it ships, `getCurrentWeekStartDate()` becomes live for everyone, so this step must be timed deliberately, not shipped mid-week by accident).

- [ ] **Step 1:** Using the `generate-template-cycle` skill (or manually), write ATHX and ATHX PRO content for next Monday's `week_start_date` directly into the new column, via the admin editor at `/admin/entrenos` — note the editor only lets you edit an existing row's blocks, so first insert the two rows (one per category) with that `week_start_date` and empty/seed content, e.g.:

```bash
set -a; source .env.local; set +a
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/workout_templates" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"category":"athx","week_start_date":"<NEXT_MONDAY>","content":{"es":null,"en":null}}'
```

(repeat for `athx_pro`), then fill in content per day/block via the admin editor as usual.

- [ ] **Step 2:** Confirm both rows are visible and editable at `/admin/entrenos` before the cutover moment.

- [ ] **Step 3:** Deploy Task 3's code at or shortly before the Sunday 22:00 Madrid rollover, so the switch to the new shared week lines up with the boundary everyone already expects.

- [ ] **Step 4:** Right after rollover, verify in production: `/entrenamiento` for a real (non-admin) logged-in user of each category, and the logged-out preview.

- [ ] **Step 5:** Leave `week_number` and its old rows in place for now. Plan a separate cleanup change later (drop the column and the legacy rows) once the new system has run for a few weeks without needing rollback.
