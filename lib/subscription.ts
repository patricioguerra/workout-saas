import { createSupabaseServerClient } from './supabase/server'

export async function getUserSubscription(userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  return data
}

export async function isUserSubscribed(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId)
  return sub !== null
}
