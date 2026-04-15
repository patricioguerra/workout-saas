import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const onboardingCompleted = user?.user_metadata?.onboarding_completed === true

  // --- Unauthenticated users ---
  if (!user) {
    if (path.startsWith('/perfil') || path.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // --- Authenticated users ---

  // Already logged in, redirect away from login
  if (path === '/login') {
    const destination = onboardingCompleted ? '/entrenamiento' : '/onboarding'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Onboarding not completed: force to /onboarding
  if (!onboardingCompleted && !path.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Onboarding completed: prevent going back to /onboarding
  if (onboardingCompleted && path.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/entrenamiento', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/perfil/:path*',
    '/login',
    '/onboarding/:path*',
    '/entrenamiento/:path*',
  ],
}
