'use server'

import { validateName, validateEmail, validateMessage } from '../domain/validators'
import { sendApplicationToAdmin } from '../infra/email-client'

export async function applyAsAmbassador(input: {
  name: string
  email: string
  socialLink?: string
  message: string
}): Promise<{ error?: string }> {
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()
  const socialLink = input.socialLink?.trim() || undefined

  const nameErr = validateName(name)
  if (nameErr) return { error: nameErr }

  const emailErr = validateEmail(email)
  if (emailErr) return { error: emailErr }

  const messageErr = validateMessage(message)
  if (messageErr) return { error: messageErr }

  try {
    await sendApplicationToAdmin({ name, email, socialLink, message })
  } catch (e) {
    console.error('Resend error (ambassador application):', e)
  }

  return {}
}
