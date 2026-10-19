import { http } from '@/shared/api/http'
import type { Riesgo } from './plinko/plinko.constantes'

export type Juego = 'plinko' | 'blackjack'

// ── Acceso a juegos (POST /api/users/games/:juego/access) ──
export type RiesgoDisponible = {
  riesgo: Riesgo
  apuestaMinima: number
  apuestaMaxima: number
  maximoMultiplicador: number
}

export type AccesoPlinko = {
  juego: 'plinko'
  saldo: number
  riesgos: RiesgoDisponible[]
}

export type AccesoBlackjack = {
  juego: 'blackjack'
  saldo: number
  mesa: { apuestaMinima: number; apuestaMaxima: number; reglas: string[] }
}

export type AccesoJuego = AccesoPlinko | AccesoBlackjack

// ── Plinko ──
export type ResultadoPlinko = {
  riesgo: Riesgo
  apuesta: number
  multiplicador: number
  /** Retorno bruto (apuesta × multiplicador); NO es la ganancia neta. */
  ganancia: number
  /** Nueve direcciones 'I' (izquierda) / 'D' (derecha) que definen el slot. */
  ruta: string[]
  gananciaNeta: number
  saldoActual: number
}

export type RondaPlinko = {
  id: string
  riesgo: Riesgo
  apuesta: number
  multiplicador: number
  ganancia: number
  ruta: string[]
  fecha: string
}

// ── Blackjack ──
export type EstadoMano = 'ACTIVA' | 'PLANTADO' | 'GANADA' | 'PERDIDA' | 'EMPATE' | 'RENDIDA'
export type EstadoPartida = 'ACTIVA' | 'GANADA' | 'PERDIDA' | 'EMPATE' | 'RENDIDA' | 'NATURAL'

export type Mano = {
  cartas: string[]
  valor: number
  apuesta: number
  estado: EstadoMano
  ganancia: number | null
}

export type PartidaBlackjack = {
  partidaId: string
  estado: EstadoPartida
  apuestaBase: number
  apuestaTotal: number
  /** El crupier envía una carta oculta como '🂠' mientras la partida sigue. */
  dealer: { cartas: string[]; totalVisible: number }
  manos: Mano[]
  cartasRestantes: number
  saldoActual?: number
  mensaje?: string
  devuelto?: number
}

export type AccionBlackjack = 'hit' | 'stand' | 'split' | 'double' | 'exit'

export type PartidaResumen = {
  id: string
  apuesta: number
  estado: EstadoPartida
  resultado: unknown
  creadaEn: string
  cerradaEn: string | null
}

export const gamesApi = {
  /** POST /api/users/games/:juego/access — valida saldo y devuelve límites. */
  acceso: (juego: Juego) => http<AccesoJuego>(`users/games/${juego}/access`, { method: 'POST' }),

  plinko: {
    apostar: (apuesta: number, riesgo: Riesgo) =>
      http<ResultadoPlinko>('games/plinko/bet', { method: 'POST', body: { apuesta, riesgo } }),
    rondas: () => http<RondaPlinko[]>('games/plinko/rounds'),
  },

  blackjack: {
    iniciar: (apuesta: number) => http<PartidaBlackjack>('games/blackjack/start', { method: 'POST', body: { apuesta } }),
    accion: (partidaId: string, accion: AccionBlackjack) =>
      http<PartidaBlackjack>(`games/blackjack/${partidaId}/${accion}`, { method: 'POST' }),
    rondas: () => http<PartidaResumen[]>('games/blackjack/rounds'),
  },
}
