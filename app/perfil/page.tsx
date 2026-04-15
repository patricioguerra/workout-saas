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

      <div className="glass rounded-xl p-5 space-y-3">
        <p>
          <span className="text-muted text-sm">Email</span>
          <br />
          {user.email}
        </p>
        <div className="border-t border-white/10" />
        <p>
          <span className="text-muted text-sm">Suscripcion</span>
          <br />
          {subscription ? (
            <span className="text-green-400">Activa</span>
          ) : (
            <span className="text-muted">Sin suscripcion</span>
          )}
        </p>
        {subscription && (
          <>
            <div className="border-t border-white/10" />
            <p>
              <span className="text-muted text-sm">Siguiente renovacion</span>
              <br />
              {new Date(subscription.current_period_end).toLocaleDateString('es-ES')}
            </p>
          </>
        )}
      </div>

      <div className="space-y-3">
        {subscription && <PortalButton />}

        <form action={signOut}>
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-red-400 glass hover:bg-white/10 transition-colors"
          >
            Cerrar sesion
          </button>
        </form>
      </div>
    </div>
  )
}
