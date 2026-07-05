import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getUserCycleWeek, getCyclePhase } from './cycle'
import { getMondayOf, formatLocalDate } from '../../../shared/utils/dates'

function madridTodayMonday(): Date {
  const SHIFT_MS = 2 * 60 * 60 * 1000
  const nowMadrid = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  )
  return getMondayOf(new Date(nowMadrid.getTime() + SHIFT_MS))
}

function startDateWeeksAgo(weeksAgo: number): string {
  const monday = madridTodayMonday()
  const d = new Date(monday)
  d.setDate(d.getDate() - weeksAgo * 7)
  return formatLocalDate(d)
}

test('week 1: cycle starts this week', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(0))
  assert.equal(weekNumber, 1)
  assert.equal(cycleNumber, 1)
})

test('week 6: no wraparound yet', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(5))
  assert.equal(weekNumber, 6)
  assert.equal(cycleNumber, 1)
})

test('week 7: keeps counting past the old 6-week cap', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(6))
  assert.equal(weekNumber, 7)
  assert.equal(cycleNumber, 1)
})

test('week 13: still no wraparound at a second old cycle boundary', () => {
  const { cycleNumber, weekNumber } = getUserCycleWeek(startDateWeeksAgo(12))
  assert.equal(weekNumber, 13)
  assert.equal(cycleNumber, 1)
})

test('phase pattern repeats every 6 weeks', () => {
  assert.equal(getCyclePhase(1).code, 'BASE')
  assert.equal(getCyclePhase(2).code, 'BASE')
  assert.equal(getCyclePhase(3).code, 'BUILD')
  assert.equal(getCyclePhase(4).code, 'BUILD')
  assert.equal(getCyclePhase(5).code, 'PEAK')
  assert.equal(getCyclePhase(6).code, 'DELOAD')
  assert.equal(getCyclePhase(7).code, 'BASE')
  assert.equal(getCyclePhase(12).code, 'DELOAD')
  assert.equal(getCyclePhase(13).code, 'BASE')
})
