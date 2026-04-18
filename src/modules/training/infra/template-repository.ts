import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import type { Category } from '@/modules/identity/domain/profile'
import type { WorkoutTemplate } from '../domain/workout'

export async function getTemplate(
  category: Category,
  weekNumber: number
): Promise<WorkoutTemplate | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('category', category)
    .eq('week_number', weekNumber)
    .single()
  return (data as WorkoutTemplate) ?? null
}
