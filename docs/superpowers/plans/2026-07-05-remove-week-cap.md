# Remove 6-Week Training Cap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let subscribed users progress past week 6 (the DB constraint capping `workout_templates.week_number` at 1-6 has already been dropped and a week-7 row exists), and let the admin UI browse/edit any week that actually exists in the DB instead of a hardcoded 1-6 list.

**Architecture:** `getUserCycleWeek` in the training domain layer currently wraps `weekNumber` modulo 6 — remove the wrap so it counts up forever. `getCyclePhase` keeps its existing Base/Build/Peak/Deload badge pattern but repeats it every 6 weeks instead of flatlining at Deload past week 6. The admin week-picker (grid + dropdown) switches from a hardcoded `[1..6]` array to a new repository/use-case pair that reads the real `week_number`s present per category from `workout_templates`.

**Tech Stack:** Next.js 16 (App Router, server components), TypeScript, Supabase, `node --test` + `node:assert/strict` for domain unit tests.

## Global Constraints

- DDD layering: `app/` routes call `application/` use cases only, never `infra/` directly (per `AGENTS.md`).
- Use case = one file = one exported function.
- No new comments unless explaining a non-obvious constraint.
- Conventional commit messages, no AI co-author trailer (per `AGENTS.md`).
- Update the dependency graph in `AGENTS.md` in the same commit as any new file.
- The Sunday 22:00 Europe/Madrid weekly rollover (`SHIFT_MS` in `cycle.ts`) is unchanged — do not touch that part of the calculation.

---

### Task 1: Domain — uncap `weekNumber`, repeat the phase pattern every 6 weeks

**Files:**
- Modify: `src/modules/training/domain/cycle.ts`
- Test: `src/modules/training/domain/cycle.test.ts` (new)

**Interfaces:**
- Produces: `getUserCycleWeek(cycleStartDate: string | Date): { cycleNumber: number; weekNumber: number }` — `weekNumber` now grows without bound (no longer wraps at 6); `cycleNumber` is always `1`.
- Produces: `getCyclePhase(weekNumber: number): { code: 'BASE'|'BUILD'|'PEAK'|'DELOAD'; label: string }` — unchanged signature, now repeats its 6-week pattern for any `weekNumber`.
- `isFreeWeek` and `WEEKS_PER_CYCLE` are unchanged (the latter is now reused inside `getCyclePhase`).

Current file for reference:

```ts
import { getMondayOf } from '@/shared/utils/dates'

export interface UserCycleWeek {
  cycleNumber: number
  weekNumber: number
}

const WEEKS_PER_CYCLE = 6
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function getUserCycleWeek(cycleStartDate: string | Date): UserCycleWeek {
  let start: Date
  if (typeof cycleStartDate === 'string') {
    const [y, m, d] = cycleStartDate.split('-').map(Number)
    start = new Date(y, m - 1, d)
  } else {
    start = cycleStartDate
  }
  const startMonday = getMondayOf(start)
  const SHIFT_MS = 2 * 60 * 60 * 1000
  const nowMadrid = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  )
  const todayMonday = getMondayOf(new Date(nowMadrid.getTime() + SHIFT_MS))

  const weeksElapsed = Math.floor(
    (todayMonday.getTime() - startMonday.getTime()) / MS_PER_WEEK
  )
  const safeWeeks = Math.max(0, weeksElapsed)

  return {
    cycleNumber: Math.floor(safeWeeks / WEEKS_PER_CYCLE) + 1,
    weekNumber: (safeWeeks % WEEKS_PER_CYCLE) + 1,
  }
}

export function isFreeWeek(cycle: UserCycleWeek): boolean {
  return cycle.cycleNumber === 1 && cycle.weekNumber === 1
}

export type PhaseCode = 'BASE' | 'BUILD' | 'PEAK' | 'DELOAD'

export interface CyclePhase {
  code: PhaseCode
  label: string
}

export function getCyclePhase(weekNumber: number): CyclePhase {
  if (weekNumber <= 2) return { code: 'BASE', label: 'Base' }
  if (weekNumber <= 4) return { code: 'BUILD', label: 'Build' }
  if (weekNumber === 5) return { code: 'PEAK', label: 'Peak' }
  return { code: 'DELOAD', label: 'Deload' }
}
```

- [ ] **Step 1: Write the failing tests**

Create `src/modules/training/domain/cycle.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getUserCycleWeek, getCyclePhase } from './cycle'
import { getMondayOf, formatLocalDate } from '../../../shared/utils/dates'

function madridTodayMonday(): Date {
  const SHIFT_MS = 2 * 60 * 60 * 1000
  const nowMadrid = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  )
  return getMondayOf(new Date(nowMadrid.getTime() + SHIFT_MS))
}

function startDateWeeksAgo(weeksAgo: number): string {
  const monday = madridTodayMonday()
  const d = new Date(monday)
  d.setDate(d.getDate() - weeksAgo * 7)
  return formatLocalDate(d)
}

test('week 1: cycle starts this week', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(0))
  assert.equal(weekNumber, 1)
  assert.equal(cycleNumber, 1)
})

test('week 6: no wraparound yet', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(5))
  assert.equal(weekNumber, 6)
  assert.equal(cycleNumber, 1)
})

test('week 7: keeps counting past the old 6-week cap', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(6))
  assert.equal(weekNumber, 7)
  assert.equal(cycleNumber, 1)
})

test('week 13: still no wraparound at a second old cycle boundary', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(12))
  assert.equal(weekNumber, 13)
  assert.equal(cycleNumber, 1)
})

test('phase pattern repeats every 6 weeks', () => {
  assert.equal(getCyclePhase(1).code, 'BASE')
  assert.equal(getCyclePhase(2).code, 'BASE')
  assert.equal(getCyclePhase(3).code, 'BUILD')
  assert.equal(getCyclePhase(4).code, 'BUILD')
  assert.equal(getCyclePhase(5).code, 'PEAK')
  assert.equal(getCyclePhase(6).code, 'DELOAD')
  assert.equal(getCyclePhase(7).code, 'BASE')
  assert.equal(getCyclePhase(12).code, 'DELOAD')
  assert.equal(getCyclePhase(13).code, 'BASE')
})
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npm run test -- src/modules/training/domain/cycle.test.ts`
Expected: FAIL — `week 7` and `week 13` tests fail because `weekNumber` currently wraps to `1` and `2`; the phase-repeat test fails because `getCyclePhase(7)` currently returns `DELOAD`.

- [ ] **Step 3: Implement the uncapped week number and repeating phase**

Edit `src/modules/training/domain/cycle.ts`:

```ts
export function getUserCycleWeek(cycleStartDate: string | Date): UserCycleWeek {
  let start: Date
  if (typeof cycleStartDate === 'string') {
    const [y, m, d] = cycleStartDate.split('-').map(Number)
    start = new Date(y, m - 1, d)
  } else {
    start = cycleStartDate
  }
  const startMonday = getMondayOf(start)
  // Semana arranca domingo 22:00 hora Madrid (Lun 00:00 − 2h).
  // toLocaleString respeta DST → 22:00 Madrid exacto todo el año.
  const SHIFT_MS = 2 * 60 * 60 * 1000
  const nowMadrid = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  )
  const todayMonday = getMondayOf(new Date(nowMadrid.getTime() + SHIFT_MS))

  const weeksElapsed = Math.floor(
    (todayMonday.getTime() - startMonday.getTime()) / MS_PER_WEEK
  )
  const safeWeeks = Math.max(0, weeksElapsed)

  return {
    cycleNumber: 1,
    weekNumber: safeWeeks + 1,
  }
}
```

```ts
export function getCyclePhase(weekNumber: number): CyclePhase {
  const w = ((weekNumber - 1) % WEEKS_PER_CYCLE) + 1
  if (w <= 2) return { code: 'BASE', label: 'Base' }
  if (w <= 4) return { code: 'BUILD', label: 'Build' }
  if (w === 5) return { code: 'PEAK', label: 'Peak' }
  return { code: 'DELOAD', label: 'Deload' }
}
```

Leave `isFreeWeek`, `WEEKS_PER_CYCLE`, `MS_PER_WEEK`, and the imports untouched.

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npm run test -- src/modules/training/domain/cycle.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/training/domain/cycle.ts src/modules/training/domain/cycle.test.ts
git commit -m "fix(training): remove 6-week wraparound from user cycle progression"
```

---

### Task 2: Admin week-override no longer clamped to 1-6

**Files:**
- Modify: `src/modules/training/application/get-week-workout.ts:21-24`

**Interfaces:**
- Consumes: nothing new.
- Produces: `getWeekWorkout(locale, weekNumberOverride?, categoryOverride?)` — `weekNumberOverride` is now accepted for any integer `>= 1` (previously capped at `<= 6`).

Current code (lines 21-24):

```ts
  const effectiveWeek =
    weekNumberOverride && weekNumberOverride >= 1 && weekNumberOverride <= 6
      ? weekNumberOverride
      : weekNumber
```

- [ ] **Step 1: Update the clamp**

```ts
  const effectiveWeek =
    weekNumberOverride && weekNumberOverride >= 1
      ? weekNumberOverride
      : weekNumber
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/training/application/get-week-workout.ts
git commit -m "fix(training): allow admin week override past week 6"
```

---

### Task 3: Repository + use case for the real list of weeks per category

**Files:**
- Modify: `src/modules/training/infra/template-repository.ts`
- Create: `src/modules/training/application/get-admin-week-numbers.ts`

**Interfaces:**
- Consumes: `createSupabaseAdmin()` from `@/shared/infra/supabase/admin` (already imported in `template-repository.ts`); `requireAdmin()` from `@/modules/support/application/require-admin` (same pattern as `get-admin-template.ts`).
- Produces: `getWeekNumbersForCategory(category: Category): Promise<number[]>` (repo, ascending, only weeks that actually have a row) and `getAdminWeekNumbers(category: Category): Promise<number[]>` (use case, admin-gated). Both are consumed by Task 5 and Task 6.

- [ ] **Step 1: Add the repository function**

Append to `src/modules/training/infra/template-repository.ts` (after `getRawTemplate`, before the `STRING_BLOCKS` comment block):

```ts
/**
 * Lists the week numbers that actually have a template row for this
 * category, ascending. Drives the admin week picker instead of a
 * hardcoded range, since weeks are uploaded incrementally and without
 * an upper bound. Service-role client — gated by requireAdmin in the use case.
 */
export async function getWeekNumbersForCategory(category: Category): Promise<number[]> {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from('workout_templates')
    .select('week_number')
    .eq('category', category)
    .order('week_number', { ascending: true })

  return (data ?? []).map((row) => row.week_number as number)
}
```

- [ ] **Step 2: Add the use case**

Create `src/modules/training/application/get-admin-week-numbers.ts`:

```ts
import { requireAdmin } from '@/modules/support/application/require-admin'
import { getWeekNumbersForCategory } from '../infra/template-repository'
import type { Category } from '@/modules/identity/domain/profile'

export async function getAdminWeekNumbers(category: Category): Promise<number[]> {
  await requireAdmin()
  return getWeekNumbersForCategory(category)
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/training/infra/template-repository.ts src/modules/training/application/get-admin-week-numbers.ts
git commit -m "feat(training): add use case to list a category's uploaded weeks"
```

---

### Task 4: Admin single-week edit page no longer capped at 6

**Files:**
- Modify: `app/[locale]/admin/entrenos/[category]/[week]/page.tsx:24`

Current code (line 24):

```ts
  if (!(weekNumber >= 1 && weekNumber <= 6)) notFound()
```

- [ ] **Step 1: Drop the upper bound**

```ts
  if (!(weekNumber >= 1)) notFound()
```

`getAdminTemplate` still returns `null` → `notFound()` on line 27 for any week that has no row, so this alone can't expose a non-existent week.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/admin/entrenos/[category]/[week]/page.tsx"
git commit -m "fix(training): remove week-6 upper bound from admin week edit page"
```

---

### Task 5: Admin week grid reads real weeks from the DB

**Files:**
- Modify: `app/[locale]/admin/entrenos/page.tsx`

**Interfaces:**
- Consumes: `getAdminWeekNumbers(category: Category): Promise<number[]>` from Task 3.

Current file:

```tsx
import { requireAdmin } from '@/modules/support/application/require-admin'
import { Link } from '@/shared/i18n/routing'

const CATEGORIES: { key: 'athx' | 'athx_pro'; label: string }[] = [
  { key: 'athx', label: 'ATHX' },
  { key: 'athx_pro', label: 'ATHX PRO' },
]
const WEEKS = [1, 2, 3, 4, 5, 6]

export default async function AdminEntrenosPage() {
  await requireAdmin()

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Editor de entrenos</h1>
      {CATEGORIES.map((cat) => (
        <div key={cat.key} className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{cat.label}</h2>
          <div className="grid grid-cols-3 gap-3">
            {WEEKS.map((w) => (
              <Link
                key={w}
                href={{
                  pathname: '/admin/entrenos/[category]/[week]',
                  params: { category: cat.key, week: String(w) },
                }}
                className="glass rounded-xl p-4 text-center hover:opacity-80"
              >
                Semana {w}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 1: Replace the hardcoded list with the real per-category weeks**

```tsx
import { requireAdmin } from '@/modules/support/application/require-admin'
import { getAdminWeekNumbers } from '@/modules/training/application/get-admin-week-numbers'
import { Link } from '@/shared/i18n/routing'

const CATEGORIES: { key: 'athx' | 'athx_pro'; label: string }[] = [
  { key: 'athx', label: 'ATHX' },
  { key: 'athx_pro', label: 'ATHX PRO' },
]

export default async function AdminEntrenosPage() {
  await requireAdmin()

  const weeksByCategory = await Promise.all(
    CATEGORIES.map((cat) => getAdminWeekNumbers(cat.key))
  )

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Editor de entrenos</h1>
      {CATEGORIES.map((cat, i) => (
        <div key={cat.key} className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{cat.label}</h2>
          <div className="grid grid-cols-3 gap-3">
            {weeksByCategory[i].map((w) => (
              <Link
                key={w}
                href={{
                  pathname: '/admin/entrenos/[category]/[week]',
                  params: { category: cat.key, week: String(w) },
                }}
                className="glass rounded-xl p-4 text-center hover:opacity-80"
              >
                Semana {w}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run `npm run dev`, sign in as an admin, visit `/admin/entrenos`. Confirm the ATHX and/or ATHX PRO grid shows a "Semana 7" tile if week 7 was uploaded for that category, and that clicking it opens the existing block editor for that week.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/admin/entrenos/page.tsx"
git commit -m "feat(training): list admin week grid from uploaded templates instead of a fixed range"
```

---

### Task 6: Admin week-picker dropdown (on `/entrenamiento`) reads real weeks

**Files:**
- Modify: `app/[locale]/entrenamiento/admin-week-badge.tsx`
- Modify: `app/[locale]/entrenamiento/page.tsx`

**Interfaces:**
- Consumes: `getAdminWeekNumbers(category: Category): Promise<number[]>` from Task 3.
- Produces: `AdminWeekBadge` gains a required `weekNumbers: number[]` prop.

Current `admin-week-badge.tsx` (relevant parts):

```tsx
interface Props {
  category: 'athx' | 'athx_pro'
  weekNumber: number
  phaseLabel: string
}

export function AdminWeekBadge({ category, weekNumber, phaseLabel }: Props) {
  ...
        <select
          value={weekNumber}
          onChange={(e) => setParam('week', e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          aria-label="Seleccionar semana"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {phaseLabel} {i + 1}
            </option>
          ))}
        </select>
  ...
}
```

- [ ] **Step 1: Add a `weekNumbers` prop and use it for the dropdown options**

Edit `app/[locale]/entrenamiento/admin-week-badge.tsx`:

```tsx
interface Props {
  category: 'athx' | 'athx_pro'
  weekNumber: number
  weekNumbers: number[]
  phaseLabel: string
}

export function AdminWeekBadge({ category, weekNumber, weekNumbers, phaseLabel }: Props) {
```

And replace the dropdown options:

```tsx
        <select
          value={weekNumber}
          onChange={(e) => setParam('week', e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          aria-label="Seleccionar semana"
        >
          {weekNumbers.map((w) => (
            <option key={w} value={w}>
              {phaseLabel} {w}
            </option>
          ))}
        </select>
```

- [ ] **Step 2: Fetch the week list in `entrenamiento/page.tsx` and pass it down**

In `app/[locale]/entrenamiento/page.tsx`, add the import:

```ts
import { getAdminWeekNumbers } from "@/modules/training/application/get-admin-week-numbers";
```

Change the `Promise.all` at line 171-174 to also fetch the week list when the viewer is an admin:

```ts
  const [subscribed, workout, adminWeekNumbers] = await Promise.all([
    isUserSubscribed(user.id),
    getWeekWorkout(locale as 'es' | 'en', adminWeekOverride, adminCategoryOverride),
    isAdmin
      ? getAdminWeekNumbers(effectiveCategory === "athx_pro" ? "athx_pro" : "athx")
      : Promise.resolve([]),
  ]);
```

Then pass it to `AdminWeekBadge` (around line 234-238):

```tsx
              <AdminWeekBadge
                category={effectiveCategory === "athx_pro" ? "athx_pro" : "athx"}
                weekNumber={weekNumber}
                weekNumbers={adminWeekNumbers}
                phaseLabel={t('week.phase')}
              />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run `npm run dev`, sign in as admin whose category has a week-7 template, visit `/entrenamiento`. Confirm the week dropdown in the header badge lists week 7 (and only the weeks that exist), and selecting it loads that week's content via the `?week=` param.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/entrenamiento/admin-week-badge.tsx" "app/[locale]/entrenamiento/page.tsx"
git commit -m "feat(training): drive admin week picker from uploaded templates instead of a fixed range"
```

---

### Task 7: Update dependency graph and run full verification

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the dependency graph**

In `AGENTS.md`, under `app/admin/entrenos/`, note the new use case dependency:

```
├─ admin/entrenos/
│  ├─ page.tsx                   ─→ support.require-admin + training.get-admin-week-numbers
│  ├─ [category]/[week]/page.tsx ─→ support.require-admin + training.get-admin-template
│  │                                + identity.profile.isCategory + entrenos.block-editor
│  └─ block-editor.tsx           ─→ training.{update-template-block, workout-validators}
```

And under `entrenamiento/page.tsx`, note it now also pulls in the week-numbers use case:

```
├─ entrenamiento/page.tsx        ─→ identity.get-current-user + billing.get-subscription-status
│                                  + training.{get-week-workout, get-preview-workout, cycle,
│                                    get-admin-week-numbers}
```

And add the new files under `training/application/`:

```
│  ├─ application/get-current-week-workout.ts
│  │    ─→ identity.{get-current-user, profile-repository} + training.{cycle, template-repository, workout}
│  ├─ get-preview-workout.ts     ─→ training.template-repository.getPublicTemplate (ATHX PRO wk1, no auth)
│  ├─ application/get-admin-template.ts    ─→ support.require-admin + training.template-repository
│  ├─ application/get-admin-week-numbers.ts ─→ support.require-admin + training.template-repository
│  └─ application/update-template-block.ts ─→ support.require-admin + training.{workout-validators, template-repository}
```

- [ ] **Step 2: Full verification**

Run, in order:

```bash
npm run test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all four pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update dependency graph for week-cap removal"
```
