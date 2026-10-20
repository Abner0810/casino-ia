import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalida todo lo que cambia cuando se mueve el dinero (saldo, estadísticas,
 * perfil con wallet y movimientos). Se llama tras depósitos, retiros y
 * acciones de juego. NO se acreditan premios de forma optimista: el saldo
 * que se muestra siempre proviene de una lectura del servidor.
 */
export function invalidarDatosDeDinero(queryClient: QueryClient): void {
  for (const clave of ['wallet', 'balance', 'perfil', 'movimientos'] as const) {
    void queryClient.invalidateQueries({ queryKey: [clave] })
  }
}
