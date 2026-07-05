import { requireAdmin } from '@/modules/support/application/require-admin'
import { getWeekNumbersForCategory } from '../infra/template-repository'
import type { Category } from '@/modules/identity/domain/profile'

export async function getAdminWeekNumbers(category: Category): Promise<number[]> {
  await requireAdmin()
  return getWeekNumbersForCategory(category)
}
