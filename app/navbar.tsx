import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function Navbar() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="px-4 py-3 flex items-center justify-between border-b border-white/10">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg text-white">
          Workout
        </Link>
        <Link href="/entrenamiento" className="text-sm text-muted hover:text-white transition-colors">
          Entrenamiento
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <Link href="/perfil" className="text-sm text-muted hover:text-white transition-colors">
            {user.email}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm px-4 py-1.5 rounded-lg btn-gradient"
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}
