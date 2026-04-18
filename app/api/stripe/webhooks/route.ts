import { NextResponse } from 'next/server'
import {
  verifyWebhook,
  handleStripeEvent,
} from '@/modules/billing/application/handle-webhook'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const event = verifyWebhook(body, signature)
    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Webhook error: ${message}` },
      { status: 400 }
    )
  }
}
