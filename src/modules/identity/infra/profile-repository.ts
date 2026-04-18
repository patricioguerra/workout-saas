import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import type { Profile } from '../domain/profile'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return (data as Profile) ?? null
}

export async function updateProfile(
  userId: string,
  patch: Partial<Profile>
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) return { error: error.message }
  return {}
}
