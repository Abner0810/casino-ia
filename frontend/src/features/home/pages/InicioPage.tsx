import { Link } from 'react-router-dom'
import { Alert, Button, Money, Skeleton } from '@/shared/ui'
import { useSession } from '@/features/auth/session.context'
import { ApiError } from '@/shared/api/errors'
import { useBalance, useSaldo } from '@/features/wallet/wallet.hooks'
import { useMovimientos } from '@/features/transactions/movimientos.hooks'
import { formatearFechaHora } from '@/shared/utils/dates'
import estilos from './Inicio.module.css'

const ACCESOS = [
  { a: '/juegos', titulo: 'Juegos', texto: 'Elige una mesa y consulta sus reglas.', icono: '🎲' },
  { a: '/billetera', titulo: 'Billetera', texto: 'Saldo simulado, recargas y retiros de prueba.', icono: '💰' },
  { a: '/movimientos', titulo: 'Movimientos', texto: 'Historial completo con filtros y paginación.', icono: '📄' },
] as const

export function InicioPage() {
  const { usuario } = useSession()
  const saldo = useSaldo()
  const balance = useBalance()
  const ultimos = useMovimientos({ pagina: 1, porPagina: 5 })

  return (
    <div className={estilos.pagina}>
      <header className={estilos.bienvenida}>
        <h1 className={estilos.titulo}>Casino IA</h1>
        <p className={estilos.subtitulo}>
          Hola, {usuario?.nombre}. Tu saldo y actividad en un solo lugar.
        </p>
      </header>

      <div className={estilos.rejilla}>
        <section className={estilos.tarjeta} aria-labelledby="titulo-saldo">
          <h2 id="titulo-saldo" className={estilos.tarjetaTitulo}>
            Saldo
          </h2>
          {saldo.isPending ? (
            <div className={estilos.cargandoBloque} role="status" aria-live="polite">
              <Skeleton ancho="8rem" alto="2rem" />
              <Skeleton ancho="12rem" alto="1rem" />
            </div>
          ) : saldo.isError ? (
            <Alert tipo="error">
              {saldo.error instanceof ApiError ? saldo.error.mensaje : 'No se pudo consultar el saldo.'}
              <Button variante="secundario" onClick={() => void saldo.refetch()}>
                Reintentar
              </Button>
            </Alert>
          ) : (
            <>
              <p className={estilos.saldoPrincipal}>
                <Money valor={saldo.data.saldo} />
              </p>
              <dl className={estilos.datos}>
                <div className={estilos.dato}>
                  <dt>Bono</dt>
                  <dd>
                    <Money valor={saldo.data.bono} />
                  </dd>
                </div>
                <div className={estilos.dato}>
                  <dt>Total disponible</dt>
                  <dd>
                    <Money valor={saldo.data.totalDisponible} />
                  </dd>
                </div>
              </dl>
              <p className={estilos.nota}>
                El bono se muestra aparte: la lógica del simulador opera sobre el saldo utilizable.
              </p>
            </>
          )}
        </section>

        <section className={estilos.tarjeta} aria-labelledby="titulo-estadisticas">
          <h2 id="titulo-estadisticas" className={estilos.tarjetaTitulo}>
            Estadísticas
          </h2>
          {balance.isPending ? (
            <div className={estilos.cargandoBloque} role="status" aria-live="polite">
              <Skeleton alto="1rem" />
              <Skeleton alto="1rem" />
              <Skeleton alto="1rem" />
            </div>
          ) : balance.isError ? (
            <Alert tipo="error">
              {balance.error instanceof ApiError ? balance.error.mensaje : 'No se pudieron consultar las estadísticas.'}
              <Button variante="secundario" onClick={() => void balance.refetch()}>
                Reintentar
              </Button>
            </Alert>
          ) : (
            <dl className={estilos.datos}>
              <div className={estilos.dato}>
                <dt>Total apostado</dt>
                <dd>
                  <Money valor={balance.data.historial.totalApostado} />
                </dd>
              </div>
              <div className={estilos.dato}>
                <dt>Total ganado</dt>
                <dd>
                  <Money valor={balance.data.historial.totalGanado} />
                </dd>
              </div>
              <div className={estilos.dato}>
                <dt>Resultado neto</dt>
                <dd>
                  <Money valor={balance.data.historial.resultadoNeto} colorearSigno />
                </dd>
              </div>
              <div className={estilos.dato}>
                <dt>Apuestas / premios</dt>
                <dd>
                  {balance.data.historial.cantidadApuestas} / {balance.data.historial.cantidadPremios}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      <section aria-labelledby="titulo-accesos" className={estilos.seccion}>
        <h2 id="titulo-accesos" className={estilos.tituloSeccion}>
          Accesos rápidos
        </h2>
        <div className={estilos.accesos}>
          {ACCESOS.map((acceso) => (
            <Link key={acceso.a} to={acceso.a} className={estilos.acceso}>
              <span className={estilos.accesoIcono} aria-hidden="true">
                {acceso.icono}
              </span>
              <span>
                <strong className={estilos.accesoTitulo}>{acceso.titulo}</strong>
                <span className={estilos.accesoTexto}>{acceso.texto}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-ultimos" className={estilos.seccion}>
        <div className={estilos.filaTitulo}>
          <h2 id="titulo-ultimos" className={estilos.tituloSeccion}>
            Últimos movimientos
          </h2>
          <Link to="/movimientos" className={estilos.verTodos}>
            Ver todos
          </Link>
        </div>
        {ultimos.isPending ? (
          <div className={estilos.cargandoBloque} role="status" aria-live="polite">
            <Skeleton alto="2.5rem" />
            <Skeleton alto="2.5rem" />
            <Skeleton alto="2.5rem" />
          </div>
        ) : ultimos.isError ? (
          <Alert tipo="info">
            No se pudieron cargar los movimientos recientes.{' '}
            <Button variante="secundario" onClick={() => void ultimos.refetch()}>
              Reintentar
            </Button>
          </Alert>
        ) : ultimos.data.items.length === 0 ? (
          <Alert tipo="info">Todavía no tienes movimientos. Empieza recargando saldo simulado.</Alert>
        ) : (
          <ul className={estilos.lista} role="list">
            {ultimos.data.items.map((movimiento) => (
              <li key={movimiento.id} className={estilos.movimiento}>
                <div className={estilos.movimientoInfo}>
                  <span className={estilos.movimientoTipo}>{movimiento.tipo}</span>
                  <span className={estilos.movimientoDescripcion}>{movimiento.descripcion}</span>
                </div>
                <div className={estilos.movimientoCifras}>
                  <Money
                    valor={
                      movimiento.tipo === 'APUESTA' || movimiento.tipo === 'RETIRO'
                        ? -Math.abs(movimiento.monto)
                        : Math.abs(movimiento.monto)
                    }
                    colorearSigno
                  />
                  <span className={estilos.movimientoFecha}>{formatearFechaHora(movimiento.fecha)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
