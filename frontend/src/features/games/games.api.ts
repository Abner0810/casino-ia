import { http } from '@/shared/api/http'
import { ejecutarOperacion } from '@/shared/api/operations'
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

export type ConfiguracionPlinko = {
  filas: number
  slots: number
  riesgos: Array<{ riesgo: Riesgo; apuestaMinima: number; apuestaMaxima: number; multiplicadores: number[] }>
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
  dividida: boolean
  doblada: boolean
}

export type PartidaBlackjack = {
  partidaId: string
  version: number
  indiceManoActiva: number | null
  accionesPermitidas: AccionBlackjack[]
  resultado: unknown
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
    configuracion: () => http<ConfiguracionPlinko>('games/plinko/config'),
    apostar: (apuesta: number, riesgo: Riesgo) =>
      ejecutarOperacion<ResultadoPlinko>('games/plinko/bet', { apuesta, riesgo }),
    rondas: async () => (await http<{ items: RondaPlinko[] }>('games/plinko/rounds')).items,
  },

  blackjack: {
    activa: () => http<{ partida: PartidaBlackjack | null }>('games/blackjack/active'),
    consultar: (partidaId: string) => http<PartidaBlackjack>(`games/blackjack/${partidaId}`),
    iniciar: (apuesta: number) => ejecutarOperacion<PartidaBlackjack>('games/blackjack/start', { apuesta }),
    accion: (partidaId: string, accion: AccionBlackjack, version: number) =>
      ejecutarOperacion<PartidaBlackjack>(`games/blackjack/${partidaId}/${accion}`, { version }),
    rondas: async () => (await http<{ items: PartidaResumen[] }>('games/blackjack/rounds')).items,
  },
}
