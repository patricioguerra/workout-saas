'use server'

import { createSupabaseServerClient } from '../supabase/server'
import { getWeekStartDate } from '../utils/dates'

export async function getWeekWorkout() {
  const supabase = await createSupabaseServerClient()
  const weekStart = getWeekStartDate()

  const { data } = await supabase
    .from('workouts')
    .select('*')
    .eq('week_start', weekStart)
    .single()

  return data
}
