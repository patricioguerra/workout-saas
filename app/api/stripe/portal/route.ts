import { NextResponse } from 'next/server'
import { createPortalSession } from '@/modules/billing/application/create-portal-session'

export async function POST() {
  const result = await createPortalSession()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ url: result.url })
}
