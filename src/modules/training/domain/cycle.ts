import { getMondayOf } from '@/shared/utils/dates'

export interface UserCycleWeek {
  cycleNumber: number
  weekNumber: number
}

const WEEKS_PER_CYCLE = 6
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function getUserCycleWeek(cycleStartDate: string | Date): UserCycleWeek {
  let start: Date
  if (typeof cycleStartDate === 'string') {
    const [y, m, d] = cycleStartDate.split('-').map(Number)
    start = new Date(y, m - 1, d)
  } else {
    start = cycleStartDate
  }
  const startMonday = getMondayOf(start)
  const todayMonday = getMondayOf(new Date())

  const weeksElapsed = Math.floor(
    (todayMonday.getTime() - startMonday.getTime()) / MS_PER_WEEK
  )
  const safeWeeks = Math.max(0, weeksElapsed)

  return {
    cycleNumber: Math.floor(safeWeeks / WEEKS_PER_CYCLE) + 1,
    weekNumber: (safeWeeks % WEEKS_PER_CYCLE) + 1,
  }
}

export function isFreeWeek(cycle: UserCycleWeek): boolean {
  return cycle.cycleNumber === 1 && cycle.weekNumber === 1
}
