import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/modules/billing/application/create-checkout-session'

export async function POST() {
  const result = await createCheckoutSession()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ url: result.url })
}
