export const NAME_MIN = 2
export const NAME_MAX = 80
export const MESSAGE_MIN = 1
export const MESSAGE_MAX = 2000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateName(name: string): string | null {
  const n = name.trim()
  if (n.length < NAME_MIN) return `Nombre demasiado corto (min ${NAME_MIN}).`
  if (n.length > NAME_MAX) return `Nombre demasiado largo (max ${NAME_MAX}).`
  return null
}

export function validateEmail(email: string): string | null {
  const e = email.trim()
  if (!EMAIL_RE.test(e)) return 'Email no válido.'
  return null
}

export function validateMessage(message: string): string | null {
  const m = message.trim()
  if (m.length < MESSAGE_MIN) return 'Mensaje vacío.'
  if (m.length > MESSAGE_MAX) return `Mensaje demasiado largo (max ${MESSAGE_MAX}).`
  return null
}
