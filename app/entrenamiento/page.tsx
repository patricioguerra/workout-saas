import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUserSubscribed } from '@/lib/subscription'
import { getWeekWorkout } from '@/lib/actions/workout'
import { SubscribeButton } from './subscribe-button'

interface Ejercicio {
  nombre: string
  series: number
  repeticiones: string
  descanso: string
  notas: string
}

interface DayContent {
  titulo: string
  ejercicios: Ejercicio[]
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

              {dayContent?.ejercicios && dayContent.ejercicios.length > 0 ? (
                <div className="mt-3 space-y-2.5">
                  {dayContent.ejercicios.map((ej, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-t border-white/5 first:border-0 first:pt-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{ej.nombre}</p>
                        {ej.notas && (
                          <p className="text-muted text-xs mt-0.5">{ej.notas}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted">
                          {ej.series}x{ej.repeticiones}
                        </p>
                        <p className="text-xs text-muted">{ej.descanso}</p>
                      </div>
                    </div>
                  ))}
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
