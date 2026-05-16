'use client'
// app/providers.tsx

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore, useEskizStore } from '@/store'
import { useLangStore } from '@/lib/i18n'
import { AppShell } from '@/components/layout/AppShell'

// Decode the `exp` claim from a JWT (returns ms timestamp). Returns null if
// the token isn't a parseable JWT or has no `exp`. Note: no signature check —
// this is purely a client hint to log out proactively before the server 401s.
function getJwtExpMs(token: string | null | undefined): number | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    // JWT payloads are base64url-encoded; convert to base64 before decoding.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(b64)) as { exp?: number }
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

const PUBLIC_PATHS = ['/login']

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    // allSettled — if one persisted store has corrupt JSON we still mount the
    // app instead of locking on a white screen forever.
    Promise.allSettled([
      useAuthStore.persist.rehydrate(),
      useLangStore.persist.rehydrate(),
      useEskizStore.persist.rehydrate(),
    ]).finally(() => setHydrated(true))
  }, [])

  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p))

  React.useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated && !isPublic) {
      router.replace('/login')
    } else if (isAuthenticated && isPublic) {
      router.replace('/dashboard')
    }
  }, [hydrated, isAuthenticated, isPublic, router])

  // Proactive expiry: decode the JWT's `exp`, log out immediately if it's
  // already past, or schedule a timeout to fire at the moment of expiry. This
  // means an idle user is bounced to /login as soon as their token dies
  // instead of waiting for the next failed request.
  React.useEffect(() => {
    if (!hydrated || !isAuthenticated || !token) return

    const expMs = getJwtExpMs(token)
    if (expMs == null) return // non-JWT token — fall back to the 401 handler

    const remaining = expMs - Date.now()
    if (remaining <= 0) {
      logout()
      return
    }
    const id = window.setTimeout(logout, remaining)
    return () => window.clearTimeout(id)
  }, [hydrated, isAuthenticated, token, logout])

  if (!hydrated) return null

  if (!isAuthenticated && !isPublic) return null

  if (isPublic) return <>{children}</>

  return <AppShell>{children}</AppShell>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>{children}</AuthGuard>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
