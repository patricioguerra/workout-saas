import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUserSubscribed } from '@/lib/subscription'
import { getWeekWorkout } from '@/lib/actions/workout'
import { SubscribeButton } from './subscribe-button'

interface WarmupExercise {
  nombre: string
  repeticiones: string
  notas?: string
}

interface FuerzaExercise {
  nombre: string
  series: number
  repeticiones: string
  tempo?: string
  peso?: string
  notas?: string
}

interface WodExercise {
  nombre: string
  repeticiones: string
  peso?: string
  notas?: string
}

interface Wod {
  tipo: string
  cap?: string
  descripcion: string
  ejercicios: WodExercise[]
  notas?: string
}

interface DayContent {
  titulo: string
  warmup?: WarmupExercise[]
  fuerza?: FuerzaExercise[]
  wod?: Wod
  recuperacion?: string
}

export default async function EntrenamientoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const subscribed = user ? await isUserSubscribed(user.id) : false
  const workout = await getWeekWorkout()

  const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

  if (!workout) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Entrenamiento semanal</h1>
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-muted">
            El entrenamiento de esta semana aun no esta disponible. Vuelve pronto.
          </p>
        </div>
      </div>
    )
  }

  const content = workout.content as Record<string, DayContent>

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Entrenamiento semanal</h1>
      <p className="text-muted text-sm mb-6">
        Semana del {new Date(workout.week_start).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
      </p>

      <div className="space-y-4">
        {days.map((day, index) => {
          const dayKey = day.toLowerCase()
          const dayContent = content[dayKey]
          const isLocked = index > 0 && !subscribed

          if (isLocked) {
            return (
              <div key={day} className="glass rounded-xl p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{day}</h2>
                    <p className="text-muted text-xs mt-0.5">
                      {dayContent?.titulo || 'Descanso'}
                    </p>
                  </div>
                  <span className="text-muted text-xs">🔒</span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  {!user ? (
                    <a href="/login" className="text-accent text-sm hover:underline">
                      Inicia sesion para suscribirte
                    </a>
                  ) : (
                    <SubscribeButton
                      className="text-accent text-sm font-medium hover:underline"
                      label="Desbloquear semana completa"
                    />
                  )}
                </div>
              </div>
            )
          }

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
