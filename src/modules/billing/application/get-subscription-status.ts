import { getActiveSubscription } from '../infra/subscription-repository'

export async function isUserSubscribed(userId: string): Promise<boolean> {
  const sub = await getActiveSubscription(userId)
  return sub !== null
}
