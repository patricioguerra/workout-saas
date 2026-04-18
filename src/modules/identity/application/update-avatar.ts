'use server'

import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import { updateProfile } from '../infra/profile-repository'

export async function updateAvatar(publicUrl: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const result = await updateProfile(user.id, { avatar_url: publicUrl })
  if (result.error) return result

  await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
  return {}
}
