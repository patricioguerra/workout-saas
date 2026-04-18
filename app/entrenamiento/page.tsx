import { getCurrentUser } from '@/modules/identity/application/get-current-user'
import { isUserSubscribed } from '@/modules/billing/application/get-subscription-status'
import { getCurrentWeekWorkout } from '@/modules/training/application/get-current-week-workout'
import { isFreeWeek as isFreeCycleWeek } from '@/modules/training/domain/cycle'
import { SubscribeButton } from './subscribe-button'

export default async function EntrenamientoPage() {
  const user = await getCurrentUser()

  // Not registered: CTA to sign up
  if (!user) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="glass rounded-xl p-8 text-center space-y-6">
          <div className="text-5xl">💪</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Tu plan personalizado te espera</h1>
            <p className="text-muted text-sm">
              Registrate para acceder a un ciclo de 6 semanas adaptado a tu nivel y categoria.
            </p>
          </div>
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
            >
              Empezar ahora
            </a>
            <p className="text-muted text-xs">Primera semana gratis</p>
          </div>
        </div>
      </div>
    )
  }

  const subscribed = await isUserSubscribed(user.id)
  const workout = await getCurrentWeekWorkout()

  const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

  if (!workout) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Entrenamiento semanal</h1>
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-muted">
            Tu entrenamiento se esta preparando. Vuelve en unos momentos.
          </p>
        </div>
      </div>
    )
  }

  const cycleNumber = workout.cycle_number
  const weekNumber = workout.week_number

  const isBlocked = !subscribed && !isFreeCycleWeek({ cycleNumber, weekNumber })

  // Blocked: paywall for week 2+ without subscription
  if (isBlocked) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="glass rounded-xl p-8 text-center space-y-6">
          <div className="text-5xl">🔒</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Continua tu ciclo</h1>
            <p className="text-muted text-sm">
              Has completado tu primera semana gratuita. Suscribete para acceder al resto del ciclo de 6 semanas.
            </p>
          </div>
          <SubscribeButton
            className="block w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
            label="Suscribirse"
          />
        </div>
      </div>
    )
  }

  const content = workout.content

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Entrenamiento semanal</h1>
      <p className="text-muted text-sm mb-6">
        Semana {weekNumber} / 6 — Ciclo {cycleNumber}
      </p>

      <div className="space-y-4">
        {days.map((day) => {
          const dayKey = day.toLowerCase() as keyof typeof content
          const dayContent = content[dayKey]

          return (
            <div key={day} className="glass rounded-xl p-4">
              <h2 className="font-semibold">{day}</h2>
              {dayContent?.titulo && (
                <p className="text-accent text-xs mt-0.5">{dayContent.titulo}</p>
              )}

              {dayContent?.recuperacion ? (
                <p className="text-muted text-sm mt-2">{dayContent.recuperacion}</p>
              ) : dayContent ? (
                <div className="mt-3 space-y-4">
                  {/* Warm-up */}
                  {dayContent.warmup && dayContent.warmup.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-accent-purple uppercase tracking-wider mb-1.5">Warm-up</p>
                      <div className="space-y-1">
                        {dayContent.warmup.map((ex, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{ex.nombre}</span>
                            <span className="text-muted text-xs">{ex.repeticiones}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fuerza */}
                  {dayContent.fuerza && dayContent.fuerza.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">Fuerza</p>
                      <div className="space-y-2">
                        {dayContent.fuerza.map((ex, i) => (
                          <div key={i} className="py-1.5 border-t border-white/5 first:border-0 first:pt-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{ex.nombre}</p>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted">{ex.series}x{ex.repeticiones}</p>
                                {ex.peso && <p className="text-xs text-muted">{ex.peso}</p>}
                              </div>
                            </div>
                            {ex.tempo && <p className="text-muted text-xs mt-0.5">{ex.tempo}</p>}
                            {ex.notas && <p className="text-muted text-xs mt-0.5">{ex.notas}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WOD */}
                  {dayContent.wod && (
                    <div>
                      <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">WOD</p>
                      <p className="text-sm font-medium mb-2">{dayContent.wod.descripcion}</p>
                      <div className="space-y-1.5">
                        {dayContent.wod.ejercicios.map((ex, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <div className="min-w-0">
                              <span>{ex.repeticiones} {ex.nombre}</span>
                              {ex.notas && <span className="text-muted text-xs ml-1">({ex.notas})</span>}
                            </div>
                            {ex.peso && <span className="text-muted text-xs shrink-0">{ex.peso}</span>}
                          </div>
                        ))}
                      </div>
                      {dayContent.wod.notas && (
                        <p className="text-muted text-xs mt-2 italic">{dayContent.wod.notas}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted text-sm mt-2">Descanso</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
