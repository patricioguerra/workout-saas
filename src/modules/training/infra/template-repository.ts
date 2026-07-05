import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import { createSupabaseAdmin } from '@/shared/infra/supabase/admin'
import type { Category } from '@/modules/identity/domain/profile'
import type { WorkoutTemplate, WeekContent, LocalizedWeekContent } from '../domain/workout'
import type { BlockKey } from '../domain/workout-validators'
import type { Locale } from '@/shared/i18n/config'

export async function getTemplate(
  category: Category,
  weekNumber: number,
  locale: Locale,
): Promise<WorkoutTemplate | null> {
  const supabase = await createSupabaseServerClient()
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

/**
 * Returns the full localized content (both languages) for the admin editor.
 * Service-role client — gated by requireAdmin in the use case.
 */
export async function getRawTemplate(
  category: Category,
  weekNumber: number,
): Promise<LocalizedWeekContent | null> {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from('workout_templates')
    .select('content')
    .eq('category', category)
    .eq('week_number', weekNumber)
    .single()

  if (!data) return null
  return data.content as LocalizedWeekContent
}

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
  weekNumber: number,
  day: keyof WeekContent,
  blockKey: BlockKey,
  byLocale: Partial<Record<Locale, unknown>>,
): Promise<{ error?: string }> {
  const supabase = createSupabaseAdmin()
  const { data, error: readErr } = await supabase
    .from('workout_templates')
    .select('content')
    .eq('category', category)
    .eq('week_number', weekNumber)
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
    .eq('week_number', weekNumber)

  if (writeErr) return { error: writeErr.message }
  return {}
}
