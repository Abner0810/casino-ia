import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { invalidarDatosDeDinero } from '@/shared/api/invalidaciones'
import { consultarOperacion } from '@/shared/api/operations'
import { Alert, Button, Cargando, Input, Money } from '@/shared/ui'
import { ApiError } from '@/shared/api/errors'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { formatearDinero, formatearMultiplicador, montoATexto, validarMontoTexto } from '@/shared/utils/money'
import { useAccesoJuego, useApostarPlinko, useConfiguracionPlinko, useRondasPlinko } from '@/features/games/games.hooks'
import type { ResultadoPlinko } from '@/features/games/games.api'
import { ETIQUETA_RIESGO, PLINKO_FILAS } from '@/features/games/plinko/plinko.constantes'
import type { Riesgo } from '@/features/games/plinko/plinko.constantes'
import { Tablero } from '@/features/games/plinko/components/Tablero'
import { RondasRecientes } from '@/features/games/plinko/components/RondasRecientes'
import estilos from './PlinkoPage.module.css'

// Duración de cada uno de los 9 pasos de la bola (coincide con la transición del CSS).
const PASO_MS = 220
const MAX_BOLAS = 20

type BolaAnimada = {
  id: string
  resultado: ResultadoPlinko
  paso: number
  animando: boolean
  finalizada: boolean
}

function esSaldoInsuficiente(error: ApiError | null): boolean {
  return Boolean(error && error.status === 400 && /saldo insuficiente/i.test(error.mensaje))
}

export default function PlinkoPage() {
  const queryClient = useQueryClient()
  const rondas = useRondasPlinko()
  const configuracion = useConfiguracionPlinko()
  const { data: acceso, isPending, isError, error, refetch } = useAccesoJuego('plinko')
  const apostar = useApostarPlinko()
  const reducido = useReducedMotion()

  const [riesgo, setRiesgo] = useState<Riesgo | null>(null)
  const [texto, setTexto] = useState('')
  const [tocado, setTocado] = useState(false)
  const [bolas, setBolas] = useState<BolaAnimada[]>([])
  const [cantidadBolas, setCantidadBolas] = useState(1)
  const [enviandoLote, setEnviandoLote] = useState(false)
  const [incierto, setIncierto] = useState(false)
  const enviando = useRef(false)
  const claveIncierta = useRef<string | undefined>(undefined)
  const bolasFinalizadasRef = useRef(0)
  const totalBolasRef = useRef(0)
  const saldoInvalidadoRef = useRef(false)

  const accesoPlinko = acceso && acceso.juego === 'plinko' ? acceso : null
  const riesgos = accesoPlinko?.riesgos ?? []
  const riesgoSeleccionado: Riesgo = riesgo ?? riesgos[0]?.riesgo ?? 'PEQUENO'
  const configRiesgo = riesgos.find((r) => r.riesgo === riesgoSeleccionado) ?? null
  // El tablero pinta el riesgo con el que se apostó; antes de apostar, el elegido.
  const riesgoTablero = bolas.length > 0 ? bolas[bolas.length - 1].resultado.riesgo ?? riesgoSeleccionado : riesgoSeleccionado

  const errorApuesta = useMemo(() => {
    const base = validarMontoTexto(texto)
    if (base) return base
    if (!configRiesgo) return null
    const valor = montoATexto(texto)
    if (valor < configRiesgo.apuestaMinima) {
      return `La apuesta mínima para el riesgo ${ETIQUETA_RIESGO[riesgoSeleccionado]} es ${formatearDinero(configRiesgo.apuestaMinima)}`
    }
    if (valor > configRiesgo.apuestaMaxima) {
      return `La apuesta máxima para el riesgo ${ETIQUETA_RIESGO[riesgoSeleccionado]} es ${formatearDinero(configRiesgo.apuestaMaxima)}`
    }
    const cantidad = Math.max(1, Math.min(MAX_BOLAS, cantidadBolas || 1))
    if (valor * cantidad > accesoPlinko!.saldo) {
      return `Saldo insuficiente para apostar ${cantidad} ${cantidad === 1 ? 'bola' : 'bolas'} con este monto.`
    }
    return null
  }, [texto, configRiesgo, riesgoSeleccionado, cantidadBolas, accesoPlinko])

  // Animación fiel paso a paso para cada bola
  useEffect(() => {
    const intervalos = new Map<string, number>()
    bolas.forEach((bola) => {
      if (!bola.animando || bola.finalizada) return
      let actual = bola.paso
      const id = window.setInterval(() => {
        actual += 1
        setBolas((prev) =>
          prev.map((b) =>
            b.id === bola.id
              ? {
                  ...b,
                  paso: actual,
                  animando: actual < PLINKO_FILAS,
                  finalizada: actual >= PLINKO_FILAS,
                }
              : b,
          ),
        )
        if (actual >= PLINKO_FILAS) {
          window.clearInterval(id)
          intervalos.delete(bola.id)
        }
      }, PASO_MS)
      intervalos.set(bola.id, id)
    })
    return () => {
      intervalos.forEach((id) => window.clearInterval(id))
    }
  }, [bolas])

  // Cuando todas las bolas finalicen, invalidar saldo una sola vez
  useEffect(() => {
    if (bolas.length === 0 || saldoInvalidadoRef.current) return
    const todasFinalizadas = bolas.every((b) => b.finalizada)
    if (todasFinalizadas && totalBolasRef.current === bolas.length && !enviandoLote) {
      saldoInvalidadoRef.current = true
      void invalidarDatosDeDinero(queryClient)
      void Promise.all([refetch(), rondas.refetch()])
    }
  }, [bolas, enviandoLote, queryClient, refetch, rondas])

  const bolasActivas = bolas.some((b) => b.animando)
  const bloqueado = apostar.isPending || bolasActivas || enviandoLote || incierto
  const errorAcceso = error instanceof ApiError ? error : null
  const errorMutacion = apostar.error instanceof ApiError ? apostar.error : null

  const ultimaBola = bolas.length > 0 && !bolasActivas ? bolas[bolas.length - 1] : null
  const anuncio =
    ultimaBola && ultimaBola.finalizada && bolas.length === 1
      ? `Resultado: ${formatearMultiplicador(ultimaBola.resultado.multiplicador)}. Retorno bruto ${formatearDinero(ultimaBola.resultado.ganancia)}. Resultado neto ${formatearDinero(ultimaBola.resultado.gananciaNeta)}. Saldo confirmado ${formatearDinero(ultimaBola.resultado.saldoActual)}.`
      : bolas.length > 0 && !bolasActivas
        ? `Se completaron ${bolas.length} ${bolas.length === 1 ? 'bola' : 'bolas'}. Revisa los resultados y el saldo actualizado.`
        : ''

  async function enviarApuesta() {
    if (bloqueado || enviando.current || !configRiesgo || errorApuesta) return
    const cantidad = Math.max(1, Math.min(MAX_BOLAS, cantidadBolas || 1))
    enviando.current = true
    setEnviandoLote(true)
    saldoInvalidadoRef.current = false
    bolasFinalizadasRef.current = 0
    totalBolasRef.current = cantidad
    setBolas([])
    setTocado(true)

    const monto = montoATexto(texto)
    const nuevasBolas: BolaAnimada[] = []

    // Enviar en lotes pequeños para no sobrecargar
    const batchSize = 4
    for (let i = 0; i < cantidad; i += batchSize) {
      const lote = []
      for (let j = 0; j < batchSize && i + j < cantidad; j++) {
        lote.push(
          apostar.mutateAsync({ apuesta: monto, riesgo: riesgoSeleccionado }).catch((error) => {
            if (error instanceof ApiError && (error.esRed || error.status >= 500)) {
              claveIncierta.current = error.operationKey
              setIncierto(true)
            }
            throw error
          }),
        )
      }
      try {
        const resultados = await Promise.allSettled(lote)
        for (const res of resultados) {
          if (res.status === 'fulfilled') {
            const data = res.value
            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            nuevasBolas.push({
              id,
              resultado: data,
              paso: 0,
              animando: !reducido,
              finalizada: reducido,
            })
          }
          // Si falla, no agregamos bola pero continuamos con las demás
        }
        setBolas([...nuevasBolas])
      } catch {
        // Continuar con siguiente lote
      }
      // Pequeña pausa entre lotes para no sobrecargar
      if (i + batchSize < cantidad) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    if (reducido && nuevasBolas.length > 0) {
      nuevasBolas.forEach((_, idx) => {
        setBolas((prev) =>
          prev.map((b, i) => (i === idx ? { ...b, paso: PLINKO_FILAS, animando: false, finalizada: true } : b)),
        )
      })
    }

    enviando.current = false
    setEnviandoLote(false)
  }

  async function reconciliar() {
    if (!claveIncierta.current || enviando.current) return
    enviando.current = true
    try {
      const operacion = await consultarOperacion<ResultadoPlinko>(claveIncierta.current)
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const nuevaBola: BolaAnimada = {
        id,
        resultado: operacion.response,
        paso: PLINKO_FILAS,
        animando: false,
        finalizada: true,
      }
      setBolas((prev) => [...prev, nuevaBola])
      saldoInvalidadoRef.current = false
      totalBolasRef.current = (totalBolasRef.current || 0) + 1
      invalidarDatosDeDinero(queryClient)
      await Promise.all([refetch(), rondas.refetch()])
      setIncierto(false)
      claveIncierta.current = undefined
      apostar.reset()
    } catch {
      // Un 404 puede preceder al commit: mantener el bloqueo y la misma clave.
    } finally { enviando.current = false }
  }

  if (isPending || configuracion.isPending) return <Cargando mensaje="Verificando tu acceso al tablero…" />

  if (isError || configuracion.isError || !acceso || acceso.juego !== 'plinko') {
    const saldo = esSaldoInsuficiente(errorAcceso)
    return (
      <section className={estilos.pagina} aria-labelledby="titulo-plinko">
        <h1 id="titulo-plinko" className={estilos.titulo}>
          Plinko
        </h1>
        {saldo ? (
          <>
            <Alert tipo="aviso" titulo="Necesitas saldo para jugar">
              {errorAcceso?.mensaje}
            </Alert>
            <p className={estilos.accionesError}>
              <Link className={estilos.enlaceBoton} to="/billetera">
                Ir a la billetera
              </Link>
            </p>
          </>
        ) : (
          <>
            <Alert tipo="error" titulo="No pudimos abrir el juego">
              {errorAcceso?.esRed
                ? 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.'
                : (errorAcceso?.mensaje ?? 'No se pudo verificar tu acceso al juego.')}
            </Alert>
            <p className={estilos.accionesError}>
              <Button onClick={() => { void refetch(); void configuracion.refetch() }}>Reintentar</Button>
            </p>
          </>
        )}
      </section>
    )
  }

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-plinko">
      <header className={estilos.encabezado}>
        <h1 id="titulo-plinko" className={estilos.titulo}>
          Plinko
        </h1>
        <p className={estilos.subtitulo}>
          Elige riesgo y apuesta una vez; la bola rebota hasta una de las diez casillas. El saldo es simulado.
        </p>
      </header>

      <p role="status" aria-live="polite" className="visually-hidden">
        {anuncio}
      </p>

      <div className={estilos.disposicion}>
        <div className={estilos.tableroEnvoltura}>
          <Tablero riesgo={riesgoTablero} multiplicadores={configuracion.data?.riesgos.find((opcion) => opcion.riesgo === riesgoTablero)?.multiplicadores ?? []} bolas={bolas.map((b) => ({ ruta: b.resultado.ruta, paso: b.paso }))} />
          <p className={estilos.tableroPie}>
            Riesgo mostrado: <strong>{ETIQUETA_RIESGO[riesgoTablero]}</strong>
          </p>
        </div>

        <div className={estilos.panel}>
          <fieldset className={estilos.grupo}>
            <legend className={estilos.legend}>Riesgo</legend>
            <div className={estilos.riesgos}>
              {riesgos.map((opcion) => {
                const activo = opcion.riesgo === riesgoSeleccionado
                return (
                  <label
                    key={opcion.riesgo}
                    className={activo ? `${estilos.riesgo} ${estilos.riesgoActivo}` : estilos.riesgo}
                  >
                    <span className={estilos.riesgoFila}>
                      <input
                        type="radio"
                        name="riesgo-plinko"
                        value={opcion.riesgo}
                        checked={activo}
                        onChange={() => setRiesgo(opcion.riesgo)}
                        disabled={bloqueado}
                      />
                      <span className={estilos.riesgoNombre}>{ETIQUETA_RIESGO[opcion.riesgo]}</span>
                    </span>
                    <span className={estilos.riesgoDetalle}>
                      Apuesta {formatearDinero(opcion.apuestaMinima)} – {formatearDinero(opcion.apuestaMaxima)}
                    </span>
                    <span className={estilos.riesgoDetalle}>
                      Multiplicador máx. {formatearMultiplicador(opcion.maximoMultiplicador)}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <form
            className={estilos.formulario}
            onSubmit={(evento) => {
              evento.preventDefault()
              setTocado(true)
              void enviarApuesta()
            }}
            noValidate
          >
            <Input
              etiqueta="Apuesta por bola"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onBlur={() => setTocado(true)}
              disabled={bloqueado}
              error={tocado ? (errorApuesta ?? undefined) : undefined}
            />
            <Input
              etiqueta={`Cantidad de bolas (máx. ${MAX_BOLAS})`}
              type="number"
              min={1}
              max={MAX_BOLAS}
              inputMode="numeric"
              value={cantidadBolas}
              onChange={(evento) => setCantidadBolas(Number(evento.target.value))}
              disabled={bloqueado}
            />
            {configRiesgo && (
              <p className={estilos.ayuda}>
                Rango permitido: {formatearDinero(configRiesgo.apuestaMinima)} –{' '}
                {formatearDinero(configRiesgo.apuestaMaxima)} · Saldo disponible:{' '}
                <Money valor={acceso.saldo} />
              </p>
            )}
            <Button type="submit" ancho cargando={enviandoLote} disabled={bloqueado || Boolean(errorApuesta) || !texto.trim()}>
              {bolasActivas ? 'Bolas en juego…' : enviandoLote ? 'Lanzando bolas…' : 'Lanzar bolas'}
            </Button>
          </form>

          {incierto && (
            <Alert tipo="aviso" titulo="Resultado incierto">
              La apuesta pudo aplicarse. Revisa el saldo y las rondas antes de realizar otra apuesta.
              <Button onClick={() => void reconciliar()} cargando={rondas.isFetching}>Reconsultar saldo y rondas</Button>
            </Alert>
          )}
          {errorMutacion && !incierto && (
            <Alert tipo="error" titulo="La apuesta no se completó">
              {errorMutacion.mensaje}
              {esSaldoInsuficiente(errorMutacion) && (
                <>
                  {' '}
                  <Link className={estilos.enlaceInline} to="/billetera">
                    Ir a la billetera
                  </Link>
                </>
              )}
            </Alert>
          )}

          {!bolasActivas && bolas.length > 0 && (
            <div className={estilos.resultado}>
              <h2 className={estilos.panelTitulo}>Resultados ({bolas.length})</h2>
              <ul className={estilos.listaResultados}>
                {bolas.map((bola, idx) => (
                  <li key={bola.id} className={estilos.resultadoItem}>
                    <div>
                      <strong>Bola {idx + 1}</strong> · {formatearMultiplicador(bola.resultado.multiplicador)} · Neto{' '}
                      <Money valor={bola.resultado.gananciaNeta} colorearSigno />
                    </div>
                  </li>
                ))}
              </ul>
              <p className={estilos.nota}>
                Un retorno bruto positivo no implica ganancia neta positiva: el resultado neto ya descuenta tu apuesta.
              </p>
            </div>
          )}
        </div>
      </div>

      <RondasRecientes />
    </section>
  )
}
