import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { generateWeeklyWorkout } from '@/lib/ai/generate-workout'

import { getWeekStartDate } from '@/lib/utils/dates'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  const weekStart = getWeekStartDate()

  // Check if workout already exists for this week
  const { data: existing } = await supabase
    .from('workouts')
    .select('id')
    .eq('week_start', weekStart)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'Workout already exists', weekStart })
  }

  try {
    const { content, promptUsed, modelVersion } = await generateWeeklyWorkout(weekStart)

    const { error } = await supabase.from('workouts').insert({
      week_start: weekStart,
      content,
      prompt_used: promptUsed,
      model_version: modelVersion,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Workout generated', weekStart })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Workout generation failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
