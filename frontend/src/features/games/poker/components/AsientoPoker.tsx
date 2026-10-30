import type { ReactNode } from 'react'
import { Money } from '@/shared/ui'
import type { JugadorPoker } from '@/features/games/games.api'
import { CartaPoker } from './CartaPoker'
import estilos from './AsientoPoker.module.css'

export type JugadorPokerMesa = JugadorPoker

type Props = {
  jugador: JugadorPokerMesa
  esUsuario?: boolean
  turno?: boolean
  demora?: number
  children?: ReactNode
}

const REVERSO = '🂠'

const etiquetaEstado: Record<JugadorPokerMesa['estado'], string> = {
  ACTIVO: 'En juego', RETIRADO: 'Se retiró', GANADOR: 'Ganador', PERDEDOR: 'Perdedor',
}

export function AsientoPoker({ jugador, esUsuario = false, turno = false, demora = 0, children }: Props) {
  const cartas: Array<string | null> = jugador.cartas ?? [REVERSO, REVERSO]
  const nombre = esUsuario ? 'Tú' : jugador.nombre
  const estadoTexto = esUsuario
        ? (jugador.estado === 'GANADOR' ? 'Ganador' : jugador.estado === 'PERDEDOR' ? 'Perdedor' : jugador.estado === 'RETIRADO' ? 'Se retiró' : 'En juego')
        : etiquetaEstado[jugador.estado]

  return (
    <article
      className={`${estilos.asiento} ${esUsuario ? estilos.usuario : ''} ${turno ? estilos.turno : ''} ${jugador.estado === 'RETIRADO' || jugador.estado === 'PERDEDOR' ? estilos.fuera : ''} ${jugador.estado === 'GANADOR' ? estilos.ganador : ''}`}
      aria-label={`${nombre}, ${estadoTexto}${turno ? ', en turno' : ''}`}
      aria-current={turno ? 'step' : undefined}
    >
      <div className={estilos.identidad}>
        <span className={estilos.icono} aria-hidden="true">♟</span>
        <div className={estilos.textos}>
          <h3>{nombre}</h3>
          <span className={estilos.estado}>{estadoTexto}</span>
        </div>
      </div>
      <div className={estilos.cartas} role="group" aria-label={esUsuario ? 'Tus cartas' : `Cartas de ${nombre}`}>
        {cartas.slice(0, 2).map((carta, indice) => (
          <CartaPoker key={`${jugador.id}-${indice}-${carta ?? 'oculta'}`} carta={carta} etiqueta={`Carta ${indice + 1} de ${nombre}`} demora={demora + indice * 80} compacta />
        ))}
        {cartas.length === 1 && <CartaPoker carta={null} etiqueta={`Carta 2 de ${nombre}`} demora={demora + 80} compacta />}
      </div>
      <p className={estilos.aporte}>Apuesta <strong><Money valor={jugador.apuesta} /></strong></p>
      {jugador.mano && <p className={estilos.mano}>{jugador.mano}</p>}
      {children}
    </article>
  )
}
