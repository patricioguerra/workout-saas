'use server'

import { createSupabaseServerClient } from '../supabase/server'

function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

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
