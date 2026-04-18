'use server'

import { getCurrentUser } from '@/modules/identity/application/get-current-user'
import { updateProfile } from '@/modules/identity/infra/profile-repository'
import type { Profile } from '@/modules/identity/domain/profile'

export async function saveFitnessData(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) return { error: 'No autenticado' }

  const rmStrictPress = formData.get('rmStrictPress') as string
  const rmBackSquat = formData.get('rmBackSquat') as string
  const rmDeadlift = formData.get('rmDeadlift') as string
  const run5kMinutes = formData.get('run5kMinutes') as string

  const patch: Partial<Profile> = {}
  if (rmStrictPress) patch.rm_strict_press = parseFloat(rmStrictPress)
  if (rmBackSquat) patch.rm_back_squat = parseFloat(rmBackSquat)
  if (rmDeadlift) patch.rm_deadlift = parseFloat(rmDeadlift)
  if (run5kMinutes) patch.run_5k_minutes = parseFloat(run5kMinutes)

  const result = await updateProfile(user.id, patch)
  if (result.error) return result
  return {}
}
