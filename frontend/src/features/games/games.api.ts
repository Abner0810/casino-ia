import { http } from '@/shared/api/http'
import { ejecutarOperacion } from '@/shared/api/operations'
import type { Riesgo } from './plinko/plinko.constantes'

export type Juego = 'plinko' | 'blackjack' | 'roulette' | 'poker'

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

export type AccesoMesa = {
  juego: 'roulette' | 'poker'
  saldo: number
  mesa: { apuestaMinima: number; apuestaMaxima: number; reglas: string[] }
}

export type AccesoJuego = AccesoPlinko | AccesoBlackjack | AccesoMesa

export type TipoApuestaRuleta = 'pleno' | 'color' | 'paridad' | 'docena' | 'columna'
export type ColorRuleta = 'rojo' | 'negro' | 'verde'
export type ResultadoRuleta = {
  rondaId: string
  numero: number
  color: ColorRuleta
  apuesta: number
  tipo: TipoApuestaRuleta
  seleccion: number | string
  multiplicador: number
  ganancia: number
  gananciaNeta: number
  saldoActual: number
}
export type ConfiguracionRuleta = {
  apuestaMinima: number
  apuestaMaxima: number
  pagos: Record<TipoApuestaRuleta, number>
}
export type RondaRuleta = Omit<ResultadoRuleta, 'rondaId' | 'gananciaNeta' | 'saldoActual'> & { id: string; fecha: string }

export type PartidaPoker = {
  partidaId: string
  version: number
  estado: 'ACTIVA' | 'GANADA' | 'PERDIDA' | 'EMPATE'
  fase: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'
  cartasJugador: string[]
  cartasBanca: string[]
  comunitarias: string[]
  apuestaBase: number
  apuestaTotal: number
  bote: number
  accionesPermitidas: AccionPoker[]
  saldoActual: number
  resultado: {
    ganador: 'JUGADOR' | 'BANCA' | 'EMPATE'
    motivo: 'SHOWDOWN' | 'RETIRO'
    manoJugador: string | null
    manoBanca: string | null
    ganancia: number
    gananciaNeta: number
  } | null
}
export type AccionPoker = 'check' | 'raise' | 'fold'
export type ConfiguracionPoker = {
  apuestaMinima: number
  apuestaMaxima: number
  maxSubidas: number
  reglas: string[]
}
export type RondaPoker = {
  id: string
  apuesta: number
  apuestaTotal: number
  bote: number
  estado: PartidaPoker['estado']
  fase: PartidaPoker['fase']
  manoJugador: string | null
  manoBanca: string | null
  ganancia: number
  creadaEn: string
  cerradaEn: string | null
}

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
  roulette: {
    configuracion: () => http<ConfiguracionRuleta>('games/roulette/config'),
    apostar: (apuesta: number, tipo: TipoApuestaRuleta, seleccion: number | string) =>
      ejecutarOperacion<ResultadoRuleta>('games/roulette/bet', { apuesta, tipo, seleccion }),
    rondas: async () => (await http<{ items: RondaRuleta[] }>('games/roulette/rounds')).items,
  },
  poker: {
    configuracion: () => http<ConfiguracionPoker>('games/poker/config'),
    activa: () => http<{ partida: PartidaPoker | null }>('games/poker/active'),
    consultar: (partidaId: string) => http<PartidaPoker>(`games/poker/${partidaId}`),
    iniciar: (apuesta: number) => ejecutarOperacion<PartidaPoker>('games/poker/start', { apuesta }),
    accion: (partidaId: string, version: number, accion: AccionPoker) =>
      ejecutarOperacion<PartidaPoker>(`games/poker/${partidaId}/action`, { version, accion }),
    rondas: async () => (await http<{ items: RondaPoker[] }>('games/poker/rounds')).items,
  },
}
