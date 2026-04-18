import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import { createSupabaseAdmin } from '@/shared/infra/supabase/admin'

export interface Subscription {
  user_id: string
  stripe_subscription_id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  return (data as Subscription) ?? null
}

export async function upsertSubscriptionAdmin(sub: Subscription) {
  const supabase = createSupabaseAdmin()
  await supabase
    .from('subscriptions')
    .upsert(sub, { onConflict: 'stripe_subscription_id' })
}

export async function updateSubscriptionAdmin(
  stripeSubscriptionId: string,
  patch: Partial<Subscription>
) {
  const supabase = createSupabaseAdmin()
  await supabase
    .from('subscriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', stripeSubscriptionId)
}
