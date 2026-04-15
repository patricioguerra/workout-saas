'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../supabase/server'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const fullName = formData.get('fullName') as string
  const age = parseInt(formData.get('age') as string, 10)
  const weight = parseFloat(formData.get('weight') as string)
  const sex = formData.get('sex') as string

  if (!fullName || !age || !weight || !sex) {
    return { error: 'Todos los campos son obligatorios' }
  }

  if (age < 14 || age > 100) {
    return { error: 'Edad debe estar entre 14 y 100' }
  }

  if (weight < 30 || weight > 300) {
    return { error: 'Peso debe estar entre 30 y 300 kg' }
  }

  // Update profile in DB
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      age,
      weight,
      sex,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileError) {
    return { error: profileError.message }
  }

  // Update user_metadata so proxy can check without DB query
  await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  })

  redirect('/onboarding/pago')
}
