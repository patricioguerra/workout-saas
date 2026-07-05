import { getCurrentUser } from '@/modules/identity/application/get-current-user'
import { getProfile } from '@/modules/identity/infra/profile-repository'
import { getUserCycleWeek } from '../domain/cycle'
import { getTemplate } from '../infra/template-repository'
import type { UserWeekWorkout } from '../domain/workout'
import type { Locale } from '@/shared/i18n/config'
import type { Category } from '@/modules/identity/domain/profile'

export async function getWeekWorkout(
  locale: Locale,
  weekNumberOverride?: number,
  categoryOverride?: Category,
): Promise<UserWeekWorkout | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getProfile(user.id)
  if (!profile?.category || !profile?.cycle_start_date) return null

  const { cycleNumber, weekNumber } = getUserCycleWeek(profile.cycle_start_date)
  const effectiveWeek =
    weekNumberOverride && weekNumberOverride >= 1
      ? weekNumberOverride
      : weekNumber

  const effectiveCategory = categoryOverride ?? profile.category

  const template = await getTemplate(effectiveCategory, effectiveWeek, locale)
  if (!template) return null

  return { ...template, cycle_number: cycleNumber, week_number: effectiveWeek }
}
