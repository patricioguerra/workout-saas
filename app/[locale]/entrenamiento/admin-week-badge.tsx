'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { getCyclePhase } from '@/modules/training/domain/cycle'

interface Props {
  category: 'athx' | 'athx_pro'
  weekNumber: number
  weekNumbers: number[]
  phaseLabel: string
}

export function AdminWeekBadge({ category, weekNumber, weekNumbers, phaseLabel }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phase = getCyclePhase(weekNumber)

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.replace(`?${params.toString()}`)
  }

  const categoryLabel = category === 'athx_pro' ? 'ATHX PRO' : 'ATHX'

  return (
    <span className="inline-flex items-center gap-2">
      <span className="badge badge--pill badge--glass relative cursor-pointer select-none">
        {categoryLabel} ▾
        <select
          value={category}
          onChange={(e) => setParam('cat', e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          aria-label="Seleccionar categoría"
        >
          <option value="athx">ATHX</option>
          <option value="athx_pro">ATHX PRO</option>
        </select>
      </span>
      <span
        className={`badge badge--pill badge--glass phase-${phase.code.toLowerCase()} relative cursor-pointer select-none`}
      >
        <span className="badge-dot phase-chip-dot" />
        {phaseLabel} {weekNumber} ▾
        <select
          value={weekNumber}
          onChange={(e) => setParam('week', e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          aria-label="Seleccionar semana"
        >
          {weekNumbers.map((w) => (
            <option key={w} value={w}>
              {phaseLabel} {w}
            </option>
          ))}
        </select>
      </span>
    </span>
  )
}
