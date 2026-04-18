export function validateBasicInfo(input: {
  fullName: string
  age: number
  weight: number
  sex: string
}): string | null {
  if (!input.fullName || !input.age || !input.weight || !input.sex) {
    return 'Todos los campos son obligatorios'
  }
  if (input.age < 14 || input.age > 100) {
    return 'Edad debe estar entre 14 y 100'
  }
  if (input.weight < 30 || input.weight > 300) {
    return 'Peso debe estar entre 30 y 300 kg'
  }
  return null
}
