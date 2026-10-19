// Reglas de la mesa, contrastadas con backend/src/modules/games/blackjack/blackjack.config.js
export const REGLAS_BLACKJACK = {
  crupierPlantaEn: 17,
  pagoBlackjackNatural: 2.5,
  pagoVictoriaNormal: 2,
  pagoEmpate: 1,
  rendicion: 0.5,
  maxManosPorSplit: 3,
} as const

/** Etiquetas legibles de los estados de mano que devuelve el servidor. */
export const ETIQUETA_ESTADO_MANO = {
  ACTIVA: 'En juego',
  PLANTADO: 'Plantada',
  GANADA: 'Ganada',
  PERDIDA: 'Perdida',
  EMPATE: 'Empate',
  RENDIDA: 'Rendida',
} as const

export const ETIQUETA_ESTADO_PARTIDA = {
  ACTIVA: 'En curso',
  GANADA: 'Ganada',
  PERDIDA: 'Perdida',
  EMPATE: 'Empate',
  RENDIDA: 'Rendida',
  NATURAL: 'Blackjack natural',
} as const
