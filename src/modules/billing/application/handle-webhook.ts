import type Stripe from 'stripe'
import { createSupabaseAdmin } from '@/shared/infra/supabase/admin'
import { stripe } from '../infra/stripe-client'
import {
  upsertSubscriptionAdmin,
  updateSubscriptionAdmin,
} from '../infra/subscription-repository'

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  return {
    start: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : null,
    end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  }
}

export function verifyWebhook(body: string, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      const supabase = createSupabaseAdmin()
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!profile) return

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const period = getSubscriptionPeriod(subscription)

      await upsertSubscriptionAdmin({
        user_id: profile.id,
        stripe_subscription_id: subscriptionId,
        status: subscription.status,
        current_period_start: period.start,
        current_period_end: period.end,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const period = getSubscriptionPeriod(subscription)
      await updateSubscriptionAdmin(subscription.id, {
        status: subscription.status,
        current_period_start: period.start,
        current_period_end: period.end,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await updateSubscriptionAdmin(subscription.id, { status: 'canceled' })
      break
    }
  }
}
