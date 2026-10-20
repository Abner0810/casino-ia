import { Alert, Money, Skeleton } from '@/shared/ui'
import { ApiError } from '@/shared/api/errors'
import { useRondasPlinko } from '@/features/games/games.hooks'
import { ETIQUETA_RIESGO } from '@/features/games/plinko/plinko.constantes'
import { formatearFechaHora } from '@/shared/utils/dates'
import { formatearMultiplicador } from '@/shared/utils/money'
import estilos from './RondasRecientes.module.css'

export function RondasRecientes() {
  const { data, isPending, isError, error } = useRondasPlinko()

  return (
    <section className={estilos.panel} aria-labelledby="titulo-rondas-plinko">
      <h2 id="titulo-rondas-plinko" className={estilos.titulo}>
        Últimas rondas
      </h2>

      {isPending && (
        <ul className={estilos.lista} role="list">
          {[0, 1, 2].map((clave) => (
            <li key={clave} className={estilos.fila}>
              <Skeleton alto="4.5rem" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <Alert tipo="error">
          {error instanceof ApiError ? error.mensaje : 'No pudimos cargar tus últimas rondas.'}
        </Alert>
      )}

      {data && data.length === 0 && (
        <p className={estilos.vacio}>Aún no has jugado ninguna ronda. Tu historial aparecerá aquí.</p>
      )}

      {data && data.length > 0 && (
        <ul className={estilos.lista} role="list">
          {data.map((ronda) => (
            <li key={ronda.id} className={estilos.fila}>
              <div className={estilos.celda}>
                <span className={estilos.etiqueta}>Riesgo</span>
                <span className={estilos.valor}>{ETIQUETA_RIESGO[ronda.riesgo]}</span>
              </div>
              <div className={estilos.celda}>
                <span className={estilos.etiqueta}>Apuesta</span>
                <Money valor={ronda.apuesta} />
              </div>
              <div className={estilos.celda}>
                <span className={estilos.etiqueta}>Multiplicador</span>
                <span className={estilos.valor}>{formatearMultiplicador(ronda.multiplicador)}</span>
              </div>
              <div className={estilos.celda}>
                <span className={estilos.etiqueta}>Retorno bruto</span>
                <Money valor={ronda.ganancia} />
              </div>
              <div className={`${estilos.celda} ${estilos.celdaFecha}`}>
                <span className={estilos.etiqueta}>Fecha</span>
                <span className={estilos.valor}>{formatearFechaHora(ronda.fecha)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={estilos.nota}>El retorno bruto es apuesta × multiplicador; no incluye el neto.</p>
    </section>
  )
}
