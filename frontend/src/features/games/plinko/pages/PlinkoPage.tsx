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
  const [resultado, setResultado] = useState<ResultadoPlinko | null>(null)
  const [paso, setPaso] = useState(0)
  const [animando, setAnimando] = useState(false)
  const [incierto, setIncierto] = useState(false)
  const enviando = useRef(false)
  const claveIncierta = useRef<string | undefined>(undefined)

  const accesoPlinko = acceso && acceso.juego === 'plinko' ? acceso : null
  const riesgos = accesoPlinko?.riesgos ?? []
  const riesgoSeleccionado: Riesgo = riesgo ?? riesgos[0]?.riesgo ?? 'PEQUENO'
  const configRiesgo = riesgos.find((r) => r.riesgo === riesgoSeleccionado) ?? null
  // El tablero pinta el riesgo con el que se apostó; antes de apostar, el elegido.
  const riesgoTablero = resultado?.riesgo ?? riesgoSeleccionado

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
    return null
  }, [texto, configRiesgo, riesgoSeleccionado])

  // Animación fiel paso a paso: solo al terminar se anuncia el resultado.
  useEffect(() => {
    if (!animando || !resultado) return
    let actual = 0
    const id = window.setInterval(() => {
      actual += 1
      setPaso(actual)
      if (actual >= PLINKO_FILAS) {
        window.clearInterval(id)
        setAnimando(false)
      }
    }, PASO_MS)
    return () => window.clearInterval(id)
  }, [animando, resultado])

  const bloqueado = apostar.isPending || animando || incierto
  const errorAcceso = error instanceof ApiError ? error : null
  const errorMutacion = apostar.error instanceof ApiError ? apostar.error : null
  const anuncio =
    resultado && !animando
      ? `Resultado: ${formatearMultiplicador(resultado.multiplicador)}. Retorno bruto ${formatearDinero(resultado.ganancia)}. Resultado neto ${formatearDinero(resultado.gananciaNeta)}. Saldo confirmado ${formatearDinero(resultado.saldoActual)}.`
      : ''

  function enviarApuesta() {
    if (bloqueado || enviando.current || !configRiesgo || errorApuesta) return
    enviando.current = true
    setResultado(null)
    apostar.mutate(
      { apuesta: montoATexto(texto), riesgo: riesgoSeleccionado },
      {
        onError: (error) => {
          if (error instanceof ApiError && (error.esRed || error.status >= 500)) {
            claveIncierta.current = error.operationKey
            setIncierto(true)
          }
        },
        onSettled: () => { enviando.current = false },
        onSuccess: (data) => {
          setResultado(data)
          if (reducido) {
            // Sin animación: se muestra directamente el resultado final.
            setPaso(PLINKO_FILAS)
            setAnimando(false)
          } else {
            setPaso(0)
            setAnimando(true)
          }
        },
      },
    )
  }

  async function reconciliar() {
    if (!claveIncierta.current || enviando.current) return
    enviando.current = true
    try {
      const operacion = await consultarOperacion<ResultadoPlinko>(claveIncierta.current)
      setResultado(operacion.response)
      setPaso(PLINKO_FILAS)
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
          <Tablero riesgo={riesgoTablero} multiplicadores={configuracion.data?.riesgos.find((opcion) => opcion.riesgo === riesgoTablero)?.multiplicadores ?? []} ruta={resultado?.ruta ?? null} paso={paso} />
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
              enviarApuesta()
            }}
            noValidate
          >
            <Input
              etiqueta="Apuesta"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onBlur={() => setTocado(true)}
              disabled={bloqueado}
              error={tocado ? (errorApuesta ?? undefined) : undefined}
            />
            {configRiesgo && (
              <p className={estilos.ayuda}>
                Rango permitido: {formatearDinero(configRiesgo.apuestaMinima)} –{' '}
                {formatearDinero(configRiesgo.apuestaMaxima)} · Saldo disponible:{' '}
                <Money valor={acceso.saldo} />
              </p>
            )}
            <Button type="submit" ancho cargando={apostar.isPending} disabled={bloqueado || Boolean(errorApuesta) || !texto.trim()}>
              {animando ? 'La bola está en juego…' : 'Apostar'}
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

          {resultado && !animando && (
            <div className={estilos.resultado}>
              <h2 className={estilos.panelTitulo}>Resultado</h2>
              <dl className={estilos.datos}>
                <div className={estilos.dato}>
                  <dt>Multiplicador</dt>
                  <dd>{formatearMultiplicador(resultado.multiplicador)}</dd>
                </div>
                <div className={estilos.dato}>
                  <dt>Retorno bruto</dt>
                  <dd>
                    <Money valor={resultado.ganancia} />
                  </dd>
                </div>
                <div className={estilos.dato}>
                  <dt>Resultado neto</dt>
                  <dd>
                    <Money valor={resultado.gananciaNeta} colorearSigno />
                  </dd>
                </div>
                <div className={estilos.dato}>
                  <dt>Saldo confirmado</dt>
                  <dd>
                    <Money valor={resultado.saldoActual} />
                  </dd>
                </div>
              </dl>
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
