import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateName, validateEmail, validateMessage } from './validators'

test('validateName: empty fails', () => {
  assert.match(validateName('') ?? '', /nombre/i)
})

test('validateName: single char fails', () => {
  assert.match(validateName('A') ?? '', /nombre/i)
})

test('validateName: valid passes', () => {
  assert.equal(validateName('Ana Pérez'), null)
})

test('validateEmail: missing @ fails', () => {
  assert.match(validateEmail('not-an-email') ?? '', /email/i)
})

test('validateEmail: missing domain fails', () => {
  assert.match(validateEmail('ana@') ?? '', /email/i)
})

test('validateEmail: valid passes', () => {
  assert.equal(validateEmail('ana@example.com'), null)
})

test('validateMessage: empty fails', () => {
  assert.match(validateMessage('') ?? '', /mensaje/i)
})

test('validateMessage: too long fails', () => {
  assert.match(validateMessage('a'.repeat(2001)) ?? '', /mensaje/i)
})

test('validateMessage: valid passes', () => {
  assert.equal(validateMessage('Quiero ser ambajador, entreno hace 5 años.'), null)
})
