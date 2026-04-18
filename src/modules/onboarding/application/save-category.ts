'use server'

import { getCurrentUser } from '@/modules/identity/application/get-current-user'
import { updateProfile } from '@/modules/identity/infra/profile-repository'
import { isCategory } from '@/modules/identity/domain/profile'

export async function saveCategory(category: string) {
  const user = await getCurrentUser()
  if (!user) return { error: 'No autenticado' }

  if (!isCategory(category)) return { error: 'Categoria invalida' }

  const result = await updateProfile(user.id, { category })
  if (result.error) return result
  return {}
}
