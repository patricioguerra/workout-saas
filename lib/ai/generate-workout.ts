import Anthropic from '@anthropic-ai/sdk'
import { METHODOLOGY_PROMPT } from './methodology'

const anthropic = new Anthropic()

export async function generateWeeklyWorkout(weekStart: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: METHODOLOGY_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Genera el plan de entrenamiento para la semana que empieza el ${weekStart}. Devuelve solo el JSON, sin texto adicional.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON from response (handle possible markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse workout JSON from AI response')
  }

  const content = JSON.parse(jsonMatch[0])

  return {
    content,
    promptUsed: METHODOLOGY_PROMPT,
    modelVersion: 'claude-sonnet-4-20250514',
  }
}
