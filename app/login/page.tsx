'use client'

import { useState } from 'react'
import { signIn, signUp } from '@/lib/actions/auth'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = isSignUp
      ? await signUp(formData)
      : await signIn(formData)

    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">
          {isSignUp ? 'Crear cuenta' : 'Iniciar sesion'}
        </h1>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <form action={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              name="fullName"
              type="text"
              placeholder="Nombre completo"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full px-3 py-2 border rounded-md"
          />
          <input
            name="password"
            type="password"
            placeholder="Contrasena"
            required
            minLength={6}
            className="w-full px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            className="w-full py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            {isSignUp ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
          }}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          {isSignUp
            ? 'Ya tienes cuenta? Inicia sesion'
            : 'No tienes cuenta? Registrate'}
        </button>
      </div>
    </div>
  )
}
