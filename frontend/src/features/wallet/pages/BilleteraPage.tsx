import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invalidarDatosDeDinero } from '@/shared/api/invalidaciones'
import { consultarOperacion } from '@/shared/api/operations'
import { Alert, Button, Input, Modal, Skeleton } from '@/shared/ui'
import { ApiError } from '@/shared/api/errors'
import {
  RETIRO_MAXIMO,
  RECARGA_MAXIMA,
  RECARGA_MINIMA,
  formatearBs,
  montoATexto,
  validarMontoRecarga,
  validarMontoRetiro,
} from '@/shared/utils/money'
import { formatearFechaHora } from '@/shared/utils/dates'
import { useBalance, useCrearCheckout, useRetirar, useSaldo } from '@/features/wallet/wallet.hooks'
import type { Balance } from '@/features/wallet/wallet.api'
import type { RespuestaOperacion } from '@/features/wallet/wallet.api'
import estilos from './Billetera.module.css'

export function BilleteraPage() {
  const queryClient = useQueryClient()
  const saldo = useSaldo()
  const balance = useBalance()
  const crearCheckout = useCrearCheckout()
  const retirar = useRetirar()

  // Los montos se mantienen como texto mientras se escriben; se convierten
  // a número solo al enviar (los DTO del backend esperan números JSON).
  const [montoRecarga, setMontoRecarga] = useState('')
  const [errorRecarga, setErrorRecarga] = useState<string | null>(null)
  const [montoRetiro, setMontoRetiro] = useState('')
  const [errorRetiro, setErrorRetiro] = useState<string | null>(null)
  const [modalRetiro, setModalRetiro] = useState(false)

  const [exito, setExito] = useState<string | null>(null)
  const [errorOperacion, setErrorOperacion] = useState<string | null>(null)
  // Solo el retiro puede quedar con resultado incierto: la recarga ocurre
  // en el checkout alojado de Stripe y el saldo se acredita tras confirmar.
  const [retiroIncierto, setRetiroIncierto] = useState(false)
  const enviando = useRef(false)
  const claveIncierta = useRef<string | undefined>(undefined)
  const bloqueado = crearCheckout.isPending || retirar.isPending || retiroIncierto

  function limpiarAvisos() {
    setExito(null)
    setErrorOperacion(null)
    setRetiroIncierto(false)
  }

  async function enviarRecarga(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueado || enviando.current) return
    limpiarAvisos()
    const validacion = validarMontoRecarga(montoRecarga)
    if (validacion) {
      setErrorRecarga(validacion)
      return
    }
    setErrorRecarga(null)
    enviando.current = true
    try {
      const resultado = await crearCheckout.mutateAsync(montoATexto(montoRecarga))
      if (!('checkoutUrl' in resultado)) {
        setErrorOperacion('El checkout sigue iniciándose. Conserva esta pantalla y vuelve a intentarlo en unos segundos.')
        return
      }
      const { checkoutUrl } = resultado
      // Salida al checkout alojado: los datos de tarjeta nunca pasan por la SPA.
      window.location.assign(checkoutUrl)
    } catch (error) {
      enviando.current = false
      setErrorOperacion(error instanceof ApiError ? error.mensaje : 'No se pudo iniciar el pago.')
    }
  }

  function abrirRetiro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueado || enviando.current) return
    limpiarAvisos()
    const validacion = validarMontoRetiro(montoRetiro)
    if (validacion) {
      setErrorRetiro(validacion)
      return
    }
    setErrorRetiro(null)
    setModalRetiro(true)
  }

  async function confirmarRetiro() {
    if (bloqueado || enviando.current) return
    enviando.current = true
    limpiarAvisos()
    try {
      const respuesta = await retirar.mutateAsync(montoATexto(montoRetiro))
      setExito(`${respuesta.mensaje ?? 'Retiro completado.'} Saldo actual: ${formatearBs(respuesta.saldoActual ?? respuesta.saldo ?? 0)}.`)
      setMontoRetiro('')
      setModalRetiro(false)
    } catch (error) {
      setModalRetiro(false)
      if (error instanceof ApiError && (error.esRed || error.status >= 500)) {
        setRetiroIncierto(true)
        claveIncierta.current = error.operationKey
      } else {
        setErrorOperacion(error instanceof ApiError ? error.mensaje : 'No se pudo completar el retiro.')
      }
    } finally { enviando.current = false }
  }

  async function reconsultarSaldo() {
    if (!claveIncierta.current || enviando.current) return
    enviando.current = true
    try {
      const operacion = await consultarOperacion<RespuestaOperacion>(claveIncierta.current)
      invalidarDatosDeDinero(queryClient)
      await Promise.all([saldo.refetch(), balance.refetch()])
      setRetiroIncierto(false)
      claveIncierta.current = undefined
      if (operacion.estado === 'CONFIRMADA') setExito(operacion.response.mensaje)
    } catch {
      setErrorOperacion('La operación todavía no puede confirmarse. Espera y vuelve a consultar; no la repitas.')
    } finally { enviando.current = false }
  }

  const reconsultando = saldo.isFetching || balance.isFetching

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-billetera">
      <header className={estilos.encabezado}>
        <h1 id="titulo-billetera" className={estilos.titulo}>
          Billetera
        </h1>
        <p className={estilos.subtitulo}>
          Saldo de simulación en bolivianos. La recarga se paga con Stripe (modo prueba) y el retiro sigue siendo
          simulado: el saldo se acredita solo cuando Stripe confirma el pago.
        </p>
      </header>

      {exito && (
        <Alert tipo="exito" titulo="Operación completada">
          {exito}
        </Alert>
      )}
      {errorOperacion && (
        <Alert tipo="error" titulo="No se pudo completar la operación">
          {errorOperacion}
        </Alert>
      )}
      {retiroIncierto && (
        <div className={estilos.avisoIncierto}>
          <Alert tipo="aviso" titulo="Resultado incierto">
            No pudimos confirmar si tu retiro se aplicó. No lo reenviamos automáticamente: reconsulta el saldo para
            ver el estado real antes de intentarlo de nuevo.
          </Alert>
          <Button variante="secundario" cargando={reconsultando} onClick={() => void reconsultarSaldo()}>
            Reconsultar saldo
          </Button>
        </div>
      )}

      <div className={estilos.rejilla}>
        <section className={estilos.tarjeta} aria-labelledby="titulo-saldo">
          <h2 id="titulo-saldo" className={estilos.tarjetaTitulo}>
            Saldo de simulación en Bs
          </h2>

          {saldo.isPending ? (
            <div className={estilos.coleccionCarga} role="status" aria-live="polite">
              <span className="visually-hidden">Consultando saldo…</span>
              <Skeleton ancho="8rem" alto="2.5rem" />
              <Skeleton ancho="100%" alto="1rem" />
              <Skeleton ancho="70%" alto="1rem" />
            </div>
          ) : saldo.isError ? (
            <div className={estilos.columnaAcciones}>
              <Alert tipo="error">No se pudo consultar tu saldo.</Alert>
              <Button variante="secundario" cargando={saldo.isFetching} onClick={() => void saldo.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <p className={estilos.saldoValor}>{formatearBs(saldo.data.saldo)}</p>
              <dl className={estilos.listaDatos}>
                <div className={estilos.dato}>
                  <dt>Bono (no retirable)</dt>
                  <dd>{formatearBs(saldo.data.bono)}</dd>
                </div>
                <div className={estilos.dato}>
                  <dt>Total mostrado (saldo + bono)</dt>
                  <dd>{formatearBs(saldo.data.totalDisponible)}</dd>
                </div>
                <div className={estilos.dato}>
                  <dt>Actualizado</dt>
                  <dd>{formatearFechaHora(saldo.data.actualizadoEn)}</dd>
                </div>
              </dl>
              <p className={estilos.nota}>
                El bono va separado del saldo: solo el saldo es utilizable para apostar o retirar.
              </p>
            </>
          )}
        </section>

        <section className={estilos.tarjeta} aria-labelledby="titulo-operaciones">
          <h2 id="titulo-operaciones" className={estilos.tarjetaTitulo}>
            Recarga con Stripe y retiro simulado
          </h2>

          <form className={estilos.formulario} onSubmit={enviarRecarga} noValidate>
            <h3 className={estilos.subtituloForm}>Recargar saldo con Stripe</h3>
            <Input
              etiqueta={`Monto a recargar (${formatearBs(RECARGA_MINIMA)} – ${formatearBs(RECARGA_MAXIMA)})`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={montoRecarga}
              onChange={(evento) => setMontoRecarga(evento.target.value)}
              error={errorRecarga ?? undefined}
            />
            <Button type="submit" ancho cargando={crearCheckout.isPending} disabled={bloqueado}>
              Pagar con Stripe
            </Button>
            <p className={estilos.nota}>
              Pago de prueba en bolivianos: usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.
              No se cobra dinero real. El saldo se acredita cuando Stripe confirma el pago.
            </p>
          </form>

          <form className={estilos.formulario} onSubmit={abrirRetiro} noValidate>
            <h3 className={estilos.subtituloForm}>Retirar saldo</h3>
            <Input
              etiqueta={`Monto a retirar (máx. ${formatearBs(RETIRO_MAXIMO)})`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={montoRetiro}
              onChange={(evento) => setMontoRetiro(evento.target.value)}
              error={errorRetiro ?? undefined}
            />
            <Button type="submit" variante="peligro" ancho cargando={retirar.isPending} disabled={bloqueado}>
              Continuar con el retiro
            </Button>
          </form>

          <p className={estilos.nota}>
            Retiro simulado: monto positivo, hasta {formatearBs(RETIRO_MAXIMO)} y con máximo dos decimales.
          </p>
        </section>
      </div>

      {balance.isPending ? (
        <section className={estilos.tarjeta} aria-labelledby="titulo-estadisticas">
          <h2 id="titulo-estadisticas" className={estilos.tarjetaTitulo}>
            Estadísticas de simulación
          </h2>
          <div className={estilos.estadisticas} role="status" aria-live="polite">
            <span className="visually-hidden">Consultando estadísticas…</span>
            {Array.from({ length: 6 }, (_, indice) => (
              <Skeleton key={indice} ancho="100%" alto="3.5rem" />
            ))}
          </div>
        </section>
      ) : balance.isError ? (
        <section className={estilos.tarjeta} aria-labelledby="titulo-estadisticas">
          <h2 id="titulo-estadisticas" className={estilos.tarjetaTitulo}>
            Estadísticas de simulación
          </h2>
          <div className={estilos.columnaAcciones}>
            <Alert tipo="error">No se pudieron consultar tus estadísticas.</Alert>
            <Button variante="secundario" cargando={balance.isFetching} onClick={() => void balance.refetch()}>
              Reintentar
            </Button>
          </div>
        </section>
      ) : (
        <Estadisticas balance={balance.data} />
      )}

      <Modal
        abierto={modalRetiro}
        alCerrar={() => {
          if (!retirar.isPending) setModalRetiro(false)
        }}
        titulo="Confirmar retiro simulado"
        pie={
          <>
            <Button variante="secundario" disabled={retirar.isPending} onClick={() => setModalRetiro(false)}>
              Cancelar
            </Button>
            <Button variante="peligro" cargando={retirar.isPending} onClick={() => void confirmarRetiro()}>
              Confirmar retiro
            </Button>
          </>
        }
      >
        <p>
          Vas a retirar {formatearBs(montoATexto(montoRetiro))} de tu saldo de simulación.
        </p>
        {saldo.data && (
          <p className={estilos.nota}>
            Saldo disponible actual: {formatearBs(saldo.data.saldo)}. El retiro se rechaza si supera ese saldo.
          </p>
        )}
        <p className={estilos.nota}>Operación simulada: no se solicitan datos de pago ni se mueve dinero real.</p>
      </Modal>
    </section>
  )
}

/** Estadísticas del historial. El bono se muestra separado del saldo utilizable. */
function Estadisticas({ balance }: { balance: Balance }) {
  const historial = balance.historial
  return (
    <section className={estilos.tarjeta} aria-labelledby="titulo-estadisticas">
      <h2 id="titulo-estadisticas" className={estilos.tarjetaTitulo}>
        Estadísticas de simulación
      </h2>

      <div className={estilos.estadisticas}>
        <div className={estilos.estadistica}>
          <span className={estilos.estadisticaEtiqueta}>Total apostado</span>
          <p className={estilos.estadisticaValor}>{formatearBs(historial.totalApostado)}</p>
        </div>
        <div className={estilos.estadistica}>
          <span className={estilos.estadisticaEtiqueta}>Total ganado</span>
          <p className={estilos.estadisticaValor}>{formatearBs(historial.totalGanado)}</p>
        </div>
        <div className={estilos.estadistica}>
          <span className={estilos.estadisticaEtiqueta}>Apuestas</span>
          <p className={estilos.estadisticaValor}>{historial.cantidadApuestas}</p>
        </div>
        <div className={estilos.estadistica}>
          <span className={estilos.estadisticaEtiqueta}>Premios</span>
          <p className={estilos.estadisticaValor}>{historial.cantidadPremios}</p>
        </div>
        <div className={estilos.estadistica}>
          <span className={estilos.estadisticaEtiqueta}>Total depositado</span>
          <p className={estilos.estadisticaValor}>{formatearBs(historial.totalDepositado)}</p>
        </div>
        <div className={estilos.estadistica}>
          <span className={estilos.estadisticaEtiqueta}>Total retirado</span>
          <p className={estilos.estadisticaValor}>{formatearBs(historial.totalRetirado)}</p>
        </div>
        <div className={estilos.estadistica}>
          <span className={estilos.estadisticaEtiqueta}>Resultado neto</span>
          <p className={estilos.estadisticaValor}>
            {historial.resultadoNeto > 0 ? '+' : ''}
            {formatearBs(historial.resultadoNeto)}
          </p>
        </div>
      </div>

      <dl className={estilos.listaDatos}>
        <div className={estilos.dato}>
          <dt>Saldo actual</dt>
          <dd>{formatearBs(balance.saldo)}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Bono actual</dt>
          <dd>{formatearBs(balance.bono)}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Total actual (saldo + bono)</dt>
          <dd>{formatearBs(balance.total)}</dd>
        </div>
      </dl>
    </section>
  )
}
