import type { Riesgo } from '@/features/games/plinko/plinko.constantes'
import { PLINKO_FILAS, PLINKO_SLOTS } from '@/features/games/plinko/plinko.constantes'
import { formatearMultiplicador } from '@/shared/utils/money'
import estilos from './Tablero.module.css'

// Geometría del tablero en unidades del viewBox (se escala con el ancho).
// El tablero es una malla triangular: la bola arranca en el vértice (nivel 0)
// y cada decisión la baja un nivel (± medio paso horizontal). Tras 9 pasos
// queda sobre una de las 10 casillas, en el centro de la casilla k = nº de 'D'.
const VIEW_ANCHO = 1000
const VIEW_ALTO = 648
const CENTRO = 500
const PASO_X = 90
const Y_INICIO = 60
const PASO_Y = 52
const RADIO_BOLA = 13
const CASILLA_ALTO = 88

type Punto = { x: number; y: number }

type BolaAnim = {
  ruta: string[]
  paso: number
}

/** Niveles 0..9 de la bola: empieza arriba y el paso final cae en la casilla. */
function posicionesDeRuta(ruta: string[]): Punto[] {
  const posiciones: Punto[] = [{ x: CENTRO, y: Y_INICIO }]
  let derechas = 0
  for (let paso = 1; paso <= PLINKO_FILAS; paso++) {
    if (ruta[paso - 1] === 'D') derechas += 1
    posiciones.push({
      x: CENTRO + (derechas - paso / 2) * PASO_X,
      y: Y_INICIO + paso * PASO_Y,
    })
  }
  return posiciones
}

/** Color de la casilla por cercanía al centro: extremos altos, centro bajos. */
function nivelCasilla(indice: number): 'alto' | 'medio' | 'bajo' {
  const distancia = Math.abs(indice - (PLINKO_SLOTS - 1) / 2)
  if (distancia >= 3) return 'alto'
  if (distancia >= 1.5) return 'medio'
  return 'bajo'
}

const CLAVIJAS = (() => {
  const clavijas: Array<Punto & { id: string }> = []
  for (let fila = 0; fila < PLINKO_FILAS; fila++) {
    for (let i = 0; i <= fila; i++) {
      clavijas.push({
        x: CENTRO + (i - fila / 2) * PASO_X,
        y: Y_INICIO + fila * PASO_Y + PASO_Y / 2,
        id: `${fila}-${i}`,
      })
    }
  }
  return clavijas
})()

type Props = {
  riesgo: Riesgo
  multiplicadores: number[]
  /** Múltiples bolas en animación/resultados. */
  bolas?: BolaAnim[]
}

export function Tablero({ riesgo, multiplicadores, bolas = [] }: Props) {
  const yCasillas = Y_INICIO + PLINKO_FILAS * PASO_Y

  return (
    <svg
      className={estilos.svg}
      viewBox={`0 0 ${VIEW_ANCHO} ${VIEW_ALTO}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Tablero de Plinko con ${PLINKO_FILAS} filas de clavijas y ${PLINKO_SLOTS} casillas de premio para el riesgo ${riesgo}`}
    >
      <g aria-hidden="true">
        {CLAVIJAS.map((clavija) => (
          <circle key={clavija.id} className={estilos.clavija} cx={clavija.x} cy={clavija.y} r={6} />
        ))}
      </g>

      {multiplicadores.map((multiplicador, indice) => {
        const centroX = CENTRO + (indice - (PLINKO_SLOTS - 1) / 2) * PASO_X
        const ancho = PASO_X - 10
        return (
          <g key={indice} className={estilos[nivelCasilla(indice)]}>
            <rect
              className={estilos.casilla}
              x={centroX - ancho / 2}
              y={yCasillas}
              width={ancho}
              height={CASILLA_ALTO}
              rx={12}
            />
            <text
              className={estilos.casillaTexto}
              x={centroX}
              y={yCasillas + CASILLA_ALTO / 2}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {formatearMultiplicador(multiplicador)}
            </text>
          </g>
        )
      })}

      {bolas.map((bola, idx) => {
        const posiciones = posicionesDeRuta(bola.ruta)
        const pos = posiciones[Math.min(bola.paso, PLINKO_FILAS)]
        return (
          <g key={idx} className={estilos.bolaGrupo} style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, opacity: 0.9 }}>
            <circle className={estilos.bola} r={RADIO_BOLA} />
          </g>
        )
      })}
    </svg>
  )
}
