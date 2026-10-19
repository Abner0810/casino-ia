// Constantes del tablero Plinko, COPIADAS del backend
// (backend/src/modules/games/plinko/plinko.config.js) para dibujar los diez
// slots con sus multiplicadores reales. El resultado siempre lo decide el
// servidor; esto es solo representación visual contrastada con el código.

export const PLINKO_FILAS = 9
export const PLINKO_SLOTS = 10

export type Riesgo = 'PEQUENO' | 'MEDIANO' | 'GRANDE'

export const RIESGOS: Riesgo[] = ['PEQUENO', 'MEDIANO', 'GRANDE']

export const MULTIPLICADORES_POR_RIESGO: Record<Riesgo, number[]> = {
  PEQUENO: [5, 2, 1.5, 1, 0.8, 0.5, 1, 1.5, 2.5, 5],
  MEDIANO: [15, 4, 1.6, 1, 0.5, 0.3, 0.8, 2, 5, 15],
  GRANDE: [30, 6, 2, 0.8, 0.3, 0.2, 0.5, 1.5, 8, 30],
}

export const ETIQUETA_RIESGO: Record<Riesgo, string> = {
  PEQUENO: 'Pequeño',
  MEDIANO: 'Mediano',
  GRANDE: 'Grande',
}
