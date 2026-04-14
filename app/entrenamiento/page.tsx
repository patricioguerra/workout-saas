import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUserSubscribed } from '@/lib/subscription'
import { getWeekWorkout } from '@/lib/actions/workout'
import { SubscribeButton } from './subscribe-button'

export default async function EntrenamientoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const subscribed = user ? await isUserSubscribed(user.id) : false
  const workout = await getWeekWorkout()

  const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

  if (!workout) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-4">Entrenamiento semanal</h1>
        <p className="text-gray-500">
          El entrenamiento de esta semana aun no esta disponible. Vuelve pronto.
        </p>
      </div>
    )
  }

  const content = workout.content as Record<string, unknown>

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">Entrenamiento semanal</h1>

      <div className="space-y-6">
        {days.map((day, index) => {
          const dayKey = day.toLowerCase()
          const dayContent = content[dayKey]
          const isLocked = index > 0 && !subscribed

          return (
            <div key={day} className="border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">{day}</h2>

              {isLocked ? (
                <div className="text-gray-400 text-sm">
                  <p>Contenido exclusivo para suscriptores</p>
                  {!user ? (
                    <a href="/login" className="text-blue-500 underline mt-1 inline-block">
                      Inicia sesion para suscribirte
                    </a>
                  ) : (
                    <SubscribeButton />
                  )}
                </div>
              ) : (
                <pre className="text-sm whitespace-pre-wrap">
                  {dayContent ? JSON.stringify(dayContent, null, 2) : 'Descanso'}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

