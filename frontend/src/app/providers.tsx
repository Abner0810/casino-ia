import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/errors'
import { SessionProvider } from '@/features/auth/session.provider'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Las consultas GET pueden reintentarse ante red o 5xx; nunca ante
            // errores de negocio (400/401/403/404/409/429).
            retry: (intentos, error) => {
              if (error instanceof ApiError) {
                const recuperable = error.status === 0 || error.status >= 500
                return recuperable && intentos < 2
              }
              return intentos < 2
            },
          },
          mutations: {
            // Las mutaciones NO se reintentan: un timeout pudo confirmar la
            // operación y reintentar duplicaría una apuesta o un retiro.
            retry: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  )
}
