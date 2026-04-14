import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserSubscription } from '@/lib/subscription'
import { signOut } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'
import { PortalButton } from './portal-button'

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const subscription = await getUserSubscription(user.id)

  return (
    <div className="max-w-lg mx-auto py-12 px-4 space-y-8">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <div className="space-y-2">
        <p><span className="font-medium">Email:</span> {user.email}</p>
        <p>
          <span className="font-medium">Suscripcion:</span>{' '}
          {subscription ? (
            <span className="text-green-600">Activa</span>
          ) : (
            <span className="text-gray-500">Sin suscripcion</span>
          )}
        </p>
        {subscription && (
          <p className="text-sm text-gray-500">
            Siguiente renovacion:{' '}
            {new Date(subscription.current_period_end).toLocaleDateString('es-ES')}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {subscription && <PortalButton />}

        <form action={signOut}>
          <button
            type="submit"
            className="w-full py-2 text-red-500 border border-red-200 rounded-md hover:bg-red-50"
          >
            Cerrar sesion
          </button>
        </form>
      </div>
    </div>
  )
}
