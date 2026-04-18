'use server'

import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import { getCurrentUser } from '@/modules/identity/application/get-current-user'
import { updateProfile } from '@/modules/identity/infra/profile-repository'
import { getWeekStartDate } from '@/shared/utils/dates'

export async function completeOnboarding() {
  const supabase = await createSupabaseServerClient()
  const user = await getCurrentUser()
  if (!user) return { error: 'No autenticado' }

  const result = await updateProfile(user.id, {
    onboarding_completed: true,
    cycle_start_date: getWeekStartDate(),
  })
  if (result.error) return result

  await supabase.auth.updateUser({ data: { onboarding_completed: true } })
  return {}
}
