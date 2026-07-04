import { Resend } from 'resend'

const key = process.env.RESEND_API_KEY
const resend = key ? new Resend(key) : null

const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const ADMIN = process.env.ADMIN_EMAIL || ''

interface ApplicationInput {
  name: string
  email: string
  socialLink?: string
  message: string
}

export async function sendApplicationToAdmin(input: ApplicationInput) {
  if (!resend || !ADMIN) return { skipped: true }
  const lines = [
    `Nombre: ${input.name}`,
    `Email: ${input.email}`,
    input.socialLink ? `Red social: ${input.socialLink}` : null,
    '',
    input.message,
  ].filter((l) => l !== null)
  await resend.emails.send({
    from: FROM,
    to: ADMIN,
    replyTo: input.email,
    subject: `Nueva solicitud de embajador: ${input.name}`,
    text: lines.join('\n'),
  })
  return { skipped: false }
}
