// Geometría y etiquetas del tablero. Los multiplicadores se consultan en
// GET /games/plinko/config para representar la configuración del servidor.

export const PLINKO_FILAS = 9
export const PLINKO_SLOTS = 10

export type Riesgo = 'PEQUENO' | 'MEDIANO' | 'GRANDE'

export const RIESGOS: Riesgo[] = ['PEQUENO', 'MEDIANO', 'GRANDE']

export const ETIQUETA_RIESGO: Record<Riesgo, string> = {
  PEQUENO: 'Pequeño',
  MEDIANO: 'Mediano',
  GRANDE: 'Grande',
}
