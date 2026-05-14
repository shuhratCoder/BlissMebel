'use client'
// app/providers.tsx

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore } from '@/store'
import { useLangStore } from '@/lib/i18n'
import { AppShell } from '@/components/layout/AppShell'

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
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    Promise.all([
      useAuthStore.persist.rehydrate(),
      useLangStore.persist.rehydrate(),
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
