'use server'

import { getCurrentUser } from '@/modules/identity/application/get-current-user'
import { updateProfile } from '@/modules/identity/infra/profile-repository'
import type { Sex } from '@/modules/identity/domain/profile'
import { validateBasicInfo } from '../domain/validators'

export async function saveBasicInfo(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) return { error: 'No autenticado' }

  const fullName = formData.get('fullName') as string
  const age = parseInt(formData.get('age') as string, 10)
  const weight = parseFloat(formData.get('weight') as string)
  const sex = formData.get('sex') as string

  const validationError = validateBasicInfo({ fullName, age, weight, sex })
  if (validationError) return { error: validationError }

  const result = await updateProfile(user.id, {
    full_name: fullName,
    age,
    weight,
    sex: sex as Sex,
  })
  if (result.error) return result

  return {}
}
