'use server'

import { createSupabaseServerClient } from '../supabase/server'

export async function saveAvatarUrl(publicUrl: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  })

  return { success: true }
}
