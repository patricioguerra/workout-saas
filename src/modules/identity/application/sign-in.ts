'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/infra/supabase/server'

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/entrenamiento')
}
