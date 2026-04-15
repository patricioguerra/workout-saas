'use client'

import { useState, useTransition, ViewTransition } from 'react'

const STEPS = [
  {
    icon: '🧠',
    title: 'Metodologia inteligente',
    description: 'Cada semana se genera un plan basado en principios de periodizacion y progresion. No es aleatorio — hay ciencia detras.',
  },
  {
    icon: '⏱',
    title: 'Duracion de las sesiones',
    description: 'Entre 45 y 60 minutos por sesion. Entrenamientos densos, sin relleno. Cada ejercicio tiene un proposito.',
  },
  {
    icon: '📈',
    title: 'Escala de pesos',
    description: 'Empieza con lo que puedas manejar. Cada semana el plan se ajusta para que progreses de forma segura y sostenible.',
  },
  {
    icon: '🚀',
    title: 'Todo listo',
    description: 'Tu primer plan semanal te esta esperando. Cada lunes tendras uno nuevo, generado con IA.',
  },
]

export default function BienvenidaPage() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [, startTransition] = useTransition()

  function goNext() {
    setDirection('forward')
    startTransition(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)))
  }

  function goBack() {
    setDirection('back')
    startTransition(() => setStep((s) => Math.max(s - 1, 0)))
  }

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 100%)' }}>
      {/* Progress dots */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between h-10">
          {step > 0 ? (
            <button onClick={goBack} className="text-sm text-muted">Atras</button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-accent' : i < step ? 'w-2 bg-accent/50' : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <ViewTransition
          key={step}
          enter={direction === 'forward' ? 'slide-forward' : 'slide-back'}
          exit={direction === 'forward' ? 'slide-forward' : 'slide-back'}
          default="none"
        >
          <div className="w-full max-w-sm text-center space-y-8">
            <div className="text-6xl">{current.icon}</div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold">{current.title}</h1>
              <p className="text-muted text-base leading-relaxed">{current.description}</p>
            </div>
          </div>
        </ViewTransition>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10">
        {isLast ? (
          <a
            href="/entrenamiento"
            className="block w-full py-3.5 rounded-xl text-base font-semibold btn-gradient text-center"
          >
            Ver mi entrenamiento
          </a>
        ) : (
          <button
            onClick={goNext}
            className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
          >
            Siguiente
          </button>
        )}
      </div>
    </div>
  )
}
