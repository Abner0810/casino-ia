import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Cargando } from '@/shared/ui'
import { invalidarDatosDeDinero } from '@/shared/api/invalidaciones'
import { formatearBs } from '@/shared/utils/money'
import { usePago, useSincronizarPago } from '../wallet.hooks'
import estilos from './RetornoPago.module.css'

// Conciliación acotada: máximo 3 intentos automáticos, nunca polling infinito.
const MAX_INTENTOS = 3

/**
 * Retorno del checkout alojado de Stripe. Con tokens solo en memoria, volver
 * del dominio de Stripe recarga la SPA y exige iniciar sesión de nuevo;
 * RequireAuth conserva esta ruta como destino. El estado real del pago lo
 * decide el servidor (webhook o /sync), nunca esta pantalla.
 */
export function RetornoPagoPage() {
  const [params] = useSearchParams()
  const pagoId = params.get('pago') ?? undefined
  const queryClient = useQueryClient()
  const pago = usePago(pagoId)
  const sincronizar = useSincronizarPago()
  const { mutate: sincronizarPago, isPending: sincronizando } = sincronizar
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    if (!pagoId || pago.data?.estado !== 'PENDIENTE' || intentos >= MAX_INTENTOS || sincronizando) return
    const temporizador = setTimeout(() => {
      sincronizarPago(pagoId, { onSettled: () => setIntentos((previos) => previos + 1) })
    }, 2000)
    return () => clearTimeout(temporizador)
  }, [pagoId, pago.data?.estado, intentos, sincronizando, sincronizarPago])

  useEffect(() => {
    if (pago.data?.estado !== 'PAGADO') return
    invalidarDatosDeDinero(queryClient)
    document.getElementById('titulo-retorno')?.focus()
  }, [pago.data?.estado, queryClient])

  if (!pagoId) {
    return (
      <section className={estilos.pagina} aria-labelledby="titulo-retorno">
        <h1 id="titulo-retorno" className={estilos.titulo} tabIndex={-1}>
          No encontramos el pago
        </h1>
        <Alert tipo="error">Falta el identificador del pago.</Alert>
        <Link to="/billetera">Volver a la billetera</Link>
      </section>
    )
  }

  if (pago.isPending) return <Cargando mensaje="Consultando el estado del pago…" />

  if (pago.isError) {
    return (
      <section className={estilos.pagina} aria-labelledby="titulo-retorno">
        <h1 id="titulo-retorno" className={estilos.titulo} tabIndex={-1}>
          No pudimos confirmar el pago
        </h1>
        <Alert tipo="error">Revisa tu conexión e inténtalo de nuevo.</Alert>
        <div className={estilos.acciones}>
          <Button variante="secundario" onClick={() => void pago.refetch()}>
            Reintentar
          </Button>
          <Link to="/billetera">Ir a la billetera</Link>
        </div>
      </section>
    )
  }

  const { estado, monto } = pago.data
  return (
    <section className={estilos.tarjeta} aria-labelledby="titulo-retorno">
      <h1 id="titulo-retorno" className={estilos.titulo} tabIndex={-1}>
        {estado === 'PAGADO' ? 'Recarga confirmada' : estado === 'PENDIENTE' ? 'Pago en proceso' : 'El pago no se completó'}
      </h1>
      <div role="status" aria-live="polite">
        {estado === 'PAGADO' && <p>Se acreditaron {formatearBs(monto)} a tu saldo de simulación.</p>}
        {estado === 'PENDIENTE' && <p>Stripe aún no confirma el pago. Vuelve a comprobarlo en unos segundos.</p>}
        {(estado === 'FALLIDO' || estado === 'EXPIRADO') && (
          <p>No se acreditó saldo y no se te cobró nada.</p>
        )}
      </div>
      <div className={estilos.acciones}>
        {estado === 'PENDIENTE' && (
          <Button variante="secundario" cargando={sincronizando} onClick={() => sincronizarPago(pagoId)}>
            Comprobar de nuevo
          </Button>
        )}
        <Link to="/billetera">Ir a la billetera</Link>
      </div>
    </section>
  )
}
