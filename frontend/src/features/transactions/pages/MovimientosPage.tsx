import { useState } from 'react'
import { Alert, Button, Input, Money, Skeleton } from '@/shared/ui'
import type { FiltrosMovimientos } from '@/shared/api/queryKeys'
import type { TipoMovimiento } from '@/features/transactions/movimientos.api'
import { useMovimientos } from '@/features/transactions/movimientos.hooks'
import { formatearFechaHora, finDelDia, inicioDelDia, zonaHorariaLocal } from '@/shared/utils/dates'
import estilos from './Movimientos.module.css'

const POR_PAGINA = 10

/** Orden en el que se ofrecen los tipos en el filtro. */
const ORDEN_TIPOS: TipoMovimiento[] = ['DEPOSITO', 'RETIRO', 'APUESTA', 'PREMIO']

// `signo` indica la dirección del dinero para mostrarlo y colorearlo; el
// texto del tipo (y el propio signo del importe) evita depender del color.
const TIPOS: Record<TipoMovimiento, { etiqueta: string; clase: string; signo: 1 | -1 }> = {
  DEPOSITO: { etiqueta: 'Depósito', clase: estilos.deposito, signo: 1 },
  RETIRO: { etiqueta: 'Retiro', clase: estilos.retiro, signo: -1 },
  APUESTA: { etiqueta: 'Apuesta', clase: estilos.apuesta, signo: -1 },
  PREMIO: { etiqueta: 'Premio', clase: estilos.premio, signo: 1 },
}

export function MovimientosPage() {
  const [pagina, setPagina] = useState(1)
  const [tipo, setTipo] = useState<TipoMovimiento | ''>('')
  const [desdeDia, setDesdeDia] = useState('')
  const [hastaDia, setHastaDia] = useState('')

  const zonaHoraria = zonaHorariaLocal()

  // Con 'YYYY-MM-DD' la comparación lexicográfica equivale a la cronológica.
  const errorRango = desdeDia && hastaDia && desdeDia > hastaDia ? 'La fecha "desde" no puede ser posterior a "hasta"' : undefined

  // Si el rango es inválido se omiten las fechas para no enviar una consulta
  // que el backend rechazaría; el error visible explica el motivo.
  const filtros: FiltrosMovimientos = {
    pagina,
    porPagina: POR_PAGINA,
    tipo: tipo || undefined,
    desde: errorRango ? undefined : inicioDelDia(desdeDia),
    hasta: errorRango ? undefined : finDelDia(hastaDia),
  }

  const movimientos = useMovimientos(filtros)
  const items = movimientos.data?.items ?? []
  const info = movimientos.data?.paginacion

  function cambiarTipo(valor: TipoMovimiento | '') {
    setTipo(valor)
    setPagina(1) // cualquier cambio de filtro vuelve a la primera página
  }

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-movimientos">
      <header className={estilos.encabezado}>
        <h1 id="titulo-movimientos" className={estilos.titulo}>
          Movimientos
        </h1>
        <p className={estilos.subtitulo}>
          Historial de tu saldo de simulación: depósitos, retiros, apuestas y premios.
        </p>
      </header>

      <section className={estilos.tarjeta} aria-labelledby="titulo-filtros">
        <h2 id="titulo-filtros" className={estilos.tarjetaTitulo}>
          Filtros
        </h2>
        <div className={estilos.filtros}>
          <div className={estilos.campo}>
            <label className={estilos.etiqueta} htmlFor="filtro-tipo">
              Tipo
            </label>
            <select
              id="filtro-tipo"
              className={estilos.select}
              value={tipo}
              onChange={(evento) => cambiarTipo(evento.target.value as TipoMovimiento | '')}
            >
              <option value="">Todos</option>
              {ORDEN_TIPOS.map((valor) => (
                <option key={valor} value={valor}>
                  {TIPOS[valor].etiqueta}
                </option>
              ))}
            </select>
          </div>
          <Input
            etiqueta="Desde"
            type="date"
            value={desdeDia}
            onChange={(evento) => {
              setDesdeDia(evento.target.value)
              setPagina(1)
            }}
            max={hastaDia || undefined}
          />
          <Input
            etiqueta="Hasta"
            type="date"
            value={hastaDia}
            onChange={(evento) => {
              setHastaDia(evento.target.value)
              setPagina(1)
            }}
            min={desdeDia || undefined}
            error={errorRango}
          />
          <p className={estilos.zonaHoraria}>Fechas en tu zona horaria: {zonaHoraria}</p>
        </div>
      </section>

      {movimientos.isPending ? (
        <div className={estilos.carga} role="status" aria-live="polite">
          <span className="visually-hidden">Cargando movimientos…</span>
          {Array.from({ length: 5 }, (_, indice) => (
            <Skeleton key={indice} ancho="100%" alto="3rem" />
          ))}
        </div>
      ) : movimientos.isError ? (
        <div className={estilos.columnaAcciones}>
          <Alert tipo="error">No se pudo cargar el historial de movimientos.</Alert>
          <Button variante="secundario" cargando={movimientos.isFetching} onClick={() => void movimientos.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className={estilos.vacio}>No hay movimientos con estos filtros.</p>
      ) : (
        <>
          <div className={estilos.tablaEnvoltorio}>
            <table className={estilos.tabla}>
              <caption className="visually-hidden">Historial de movimientos</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Saldo antes</th>
                  <th scope="col">Saldo después</th>
                  <th scope="col">Juego</th>
                  <th scope="col">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((movimiento) => {
                  const meta = TIPOS[movimiento.tipo]
                  return (
                    <tr key={movimiento.id}>
                      <td data-etiqueta="Fecha">{formatearFechaHora(movimiento.fecha)}</td>
                      <td data-etiqueta="Tipo">
                        <span className={`${estilos.insignia} ${meta.clase}`}>{meta.etiqueta}</span>
                      </td>
                      <td data-etiqueta="Monto">
                        <Money valor={meta.signo * movimiento.monto} colorearSigno />
                      </td>
                      <td data-etiqueta="Saldo antes">
                        <Money valor={movimiento.saldoAntes} />
                      </td>
                      <td data-etiqueta="Saldo después">
                        <Money valor={movimiento.saldoDespues} />
                      </td>
                      <td data-etiqueta="Juego">{movimiento.juego ?? '—'}</td>
                      <td data-etiqueta="Descripción">{movimiento.descripcion}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {info && (
            <div className={estilos.paginacion}>
              <Button
                variante="secundario"
                disabled={info.pagina <= 1 || movimientos.isFetching}
                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
              >
                Anterior
              </Button>
              <p className={estilos.paginacionInfo} aria-live="polite">
                Página {info.pagina} de {info.totalPaginas} ({info.total} {info.total === 1 ? 'movimiento' : 'movimientos'})
              </p>
              <Button
                variante="secundario"
                disabled={info.pagina >= info.totalPaginas || movimientos.isFetching}
                onClick={() => setPagina((actual) => actual + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
