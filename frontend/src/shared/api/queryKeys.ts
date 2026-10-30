// Claves de TanStack Query. Incluyen el usuario para que, al cambiar de
// sesión, nunca se mezcle la caché de una cuenta con otra (además de limpiar
// la caché completa en login/logout).

export type FiltrosMovimientos = {
  pagina: number
  porPagina: number
  tipo?: string
  desde?: string
  hasta?: string
}

export const qk = {
  perfil: (uid?: string) => ['perfil', uid ?? 'anonimo'] as const,
  wallet: (uid?: string) => ['wallet', uid ?? 'anonimo'] as const,
  balance: (uid?: string) => ['balance', uid ?? 'anonimo'] as const,
  movimientos: (uid?: string | undefined, filtros?: FiltrosMovimientos) =>
    ['movimientos', uid ?? 'anonimo', filtros ?? {}] as const,
  accesoJuego: (uid?: string, juego?: string) => ['acceso', uid ?? 'anonimo', juego ?? ''] as const,
  plinkoRondas: (uid?: string) => ['plinko', 'rondas', uid ?? 'anonimo'] as const,
  blackjackRondas: (uid?: string) => ['blackjack', 'rondas', uid ?? 'anonimo'] as const,
  pago: (uid?: string, pagoId?: string) => ['pago', uid ?? 'anonimo', pagoId ?? ''] as const,
}
