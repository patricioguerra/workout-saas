import { notFound } from 'next/navigation'
import { requireAdmin } from '@/modules/support/application/require-admin'
import { getAdminTemplate } from '@/modules/training/application/get-admin-template'
import { isCategory } from '@/modules/identity/domain/profile'
import type { WeekContent } from '@/modules/training/domain/workout'
import type { BlockKey } from '@/modules/training/domain/workout-validators'
import { BlockEditor } from '../../block-editor'

const DAYS: (keyof WeekContent)[] = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
]
const BLOCKS: BlockKey[] = ['titulo', 'warmup', 'fuerza', 'wod', 'recuperacion']

export default async function Page({
  params,
}: {
  params: Promise<{ category: string; week: string }>
}) {
  await requireAdmin()
  const { category, week } = await params

  if (!isCategory(category)) notFound()
  const weekNumber = parseInt(week)
  if (!(weekNumber >= 1)) notFound()

  const content = await getAdminTemplate(category, weekNumber)
  if (!content) notFound()

  const es = content.es
  const en = content.en

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">
        {category === 'athx_pro' ? 'ATHX PRO' : 'ATHX'} · Semana {weekNumber}
      </h1>
      {DAYS.map((day) => {
        const esDay = es?.[day] as Record<string, unknown> | undefined
        const enDay = en?.[day] as Record<string, unknown> | undefined
        return (
          <section key={day} className="mb-8 glass rounded-xl p-4">
            <h2 className="text-lg font-semibold capitalize mb-3">{day}</h2>
            {BLOCKS.map((blockKey) => (
              <BlockEditor
                key={blockKey}
                category={category}
                week={weekNumber}
                day={day}
                blockKey={blockKey}
                valueEs={esDay?.[blockKey] ?? null}
                valueEn={enDay?.[blockKey] ?? null}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}
