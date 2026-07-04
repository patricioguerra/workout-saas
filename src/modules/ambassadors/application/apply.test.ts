import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyAsAmbassador } from './apply'

test('rejects empty name', async () => {
  const res = await applyAsAmbassador({ name: '', email: 'ana@example.com', message: 'Hola, quiero aplicar.' })
  assert.match(res.error ?? '', /nombre/i)
})

test('rejects invalid email', async () => {
  const res = await applyAsAmbassador({ name: 'Ana Pérez', email: 'not-an-email', message: 'Hola, quiero aplicar.' })
  assert.match(res.error ?? '', /email/i)
})

test('rejects empty message', async () => {
  const res = await applyAsAmbassador({ name: 'Ana Pérez', email: 'ana@example.com', message: '' })
  assert.match(res.error ?? '', /mensaje/i)
})

test('accepts valid input with no socialLink (email send is skipped without RESEND_API_KEY in test env)', async () => {
  const res = await applyAsAmbassador({
    name: 'Ana Pérez',
    email: 'ana@example.com',
    message: 'Entreno hace 5 años, tengo 10k seguidores en Instagram.',
  })
  assert.equal(res.error, undefined)
})

test('accepts valid input with socialLink', async () => {
  const res = await applyAsAmbassador({
    name: 'Ana Pérez',
    email: 'ana@example.com',
    socialLink: 'https://instagram.com/anaperez',
    message: 'Entreno hace 5 años.',
  })
  assert.equal(res.error, undefined)
})
