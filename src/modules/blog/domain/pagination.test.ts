import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toSafePage, toOffset, toTotalPages, PAGE_SIZE } from './pagination'

test('toSafePage: valid page passes through', () => {
  assert.equal(toSafePage(3), 3)
})

test('toSafePage: zero clamps to 1', () => {
  assert.equal(toSafePage(0), 1)
})

test('toSafePage: negative clamps to 1', () => {
  assert.equal(toSafePage(-5), 1)
})

test('toSafePage: NaN clamps to 1', () => {
  assert.equal(toSafePage(NaN), 1)
})

test('toSafePage: fractional page floors', () => {
  assert.equal(toSafePage(2.9), 2)
})

test('toOffset: page 1 is offset 0', () => {
  assert.equal(toOffset(1), 0)
})

test('toOffset: page 3 with default page size', () => {
  assert.equal(toOffset(3), 2 * PAGE_SIZE)
})

test('toOffset: custom page size', () => {
  assert.equal(toOffset(2, 5), 5)
})

test('toTotalPages: zero total is still 1 page', () => {
  assert.equal(toTotalPages(0), 1)
})

test('toTotalPages: exact multiple', () => {
  assert.equal(toTotalPages(20, 10), 2)
})

test('toTotalPages: rounds up a partial page', () => {
  assert.equal(toTotalPages(21, 10), 3)
})
