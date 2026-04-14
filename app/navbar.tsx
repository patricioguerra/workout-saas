import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function Navbar() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg">
          Workout
        </Link>
        <Link href="/entrenamiento" className="text-sm hover:underline">
          Entrenamiento
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <Link href="/perfil" className="text-sm hover:underline">
            {user.email}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm px-4 py-1.5 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}
