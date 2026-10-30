import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/session.context'
import { gamesApi } from '@/features/games/games.api'
import type { AccionPoker, PartidaPoker } from '@/features/games/games.api'
import { useAccesoJuego, useAccionPoker, useConfiguracionPoker, useIniciarPoker, useRondasPoker } from '@/features/games/games.hooks'
import { consultarOperacion } from '@/shared/api/operations'
import { invalidarDatosDeDinero } from '@/shared/api/invalidaciones'
import { ApiError } from '@/shared/api/errors'
import { Alert, Button, Cargando, Modal, Money } from '@/shared/ui'
import { formatearFechaHora } from '@/shared/utils/dates'
import { ApuestaForm } from '@/features/games/components/ApuestaForm'
import { AsientoPoker } from '../components/AsientoPoker'
import { CartaPoker } from '../components/CartaPoker'
import estilos from './PokerPage.module.css'

const FASES = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'] as const
const ETIQUETAS: Record<PartidaPoker['fase'], string> = {
  PREFLOP: 'Cartas iniciales', FLOP: 'Flop', TURN: 'Turn', RIVER: 'River', SHOWDOWN: 'Resultado',
}
const SIGUIENTE: Record<(typeof FASES)[number], string> = {
  PREFLOP: 'flop', FLOP: 'turn', TURN: 'river', RIVER: 'resultado',
}

function tituloResultado(partida: PartidaPoker) {
  if (partida.resultado?.motivo === 'RETIRO') return 'Te retiraste'
  const jugadores = partida.jugadores ?? []
  const idUsuario = jugadores.find((jugador) => jugador.tipo === 'HUMANO')?.id
  if (idUsuario && partida.resultado?.ganadores?.includes(idUsuario)) return 'Ganaste el bote'
  if (partida.estado === 'GANADA') return 'Ganaste el bote'
  if (partida.estado === 'EMPATE') return 'Empate'
  return 'Ganó otro jugador'
}

export default function PokerPage() {
  const { usuario } = useSession()
  return <MesaPoker key={usuario?.publicId} usuarioId={usuario?.publicId ?? 'sin-sesion'} />
}

function MesaPoker({ usuarioId }: { usuarioId: string }) {
  const queryClient = useQueryClient()
  const claveMesa = ['poker', 'mesa', usuarioId] as const
  const activaQuery = useQuery({ queryKey: claveMesa, queryFn: gamesApi.poker.activa, enabled: usuarioId !== 'sin-sesion', staleTime: 0, retry: false })
  const acceso = useAccesoJuego('poker')
  const config = useConfiguracionPoker()
  const rondas = useRondasPoker()
  const iniciar = useIniciarPoker()
  const actuar = useAccionPoker()
  const [incierta, setIncierta] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [confirmarRetiro, setConfirmarRetiro] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const claveIncierta = useRef<string | undefined>(undefined)
  const enviando = useRef(false)
  const partida = activaQuery.data?.partida ?? null
  const jugadores = partida?.jugadores ?? []
  const oponentes = jugadores.filter((jugador) => jugador.tipo === 'BOT')
  const jugadorUsuario = jugadores.find((jugador) => jugador.tipo === 'HUMANO')
  const mesa = acceso.data?.juego === 'poker' ? acceso.data : null
  const minimo = config.data?.apuestaMinima ?? mesa?.mesa.apuestaMinima ?? 1
  const maximo = config.data?.apuestaMaxima ?? mesa?.mesa.apuestaMaxima ?? 1000
  const bloqueado = iniciar.isPending || actuar.isPending || recuperando || incierta || activaQuery.isFetching
  const enCurso = partida?.estado === 'ACTIVA'

  function guardar(nueva: PartidaPoker | null) { queryClient.setQueryData(claveMesa, { partida: nueva }) }

  function mostrarError(fallo: unknown) {
    const incierto = !(fallo instanceof ApiError) || fallo.esRed || fallo.status >= 500
    if (incierto) {
      claveIncierta.current = fallo instanceof ApiError ? fallo.operationKey : undefined
      setIncierta(true)
    }
    setErrorLocal(fallo instanceof Error ? fallo.message : 'No se pudo confirmar la acción.')
  }

  async function empezar(apuesta: number) {
    if (enviando.current || bloqueado || enCurso || !mesa || !config.data) return
    enviando.current = true
    setErrorLocal(null)
    let conflicto = false
    try {
      guardar(await iniciar.mutateAsync(apuesta))
      void acceso.refetch()
    } catch (fallo) {
      mostrarError(fallo)
      conflicto = fallo instanceof ApiError && fallo.status === 409
    } finally { enviando.current = false }
    if (conflicto) await recuperar()
  }

  async function enviar(accion: AccionPoker) {
    if (enviando.current || bloqueado || !partida || !partida.accionesPermitidas.includes(accion)) return
    enviando.current = true
    setErrorLocal(null)
    let conflicto = false
    try {
      guardar(await actuar.mutateAsync({ partidaId: partida.partidaId, version: partida.version, accion }))
      setConfirmarRetiro(false)
      void acceso.refetch()
    } catch (fallo) {
      mostrarError(fallo)
      conflicto = fallo instanceof ApiError && fallo.status === 409
    } finally { enviando.current = false }
    if (conflicto) { setConfirmarRetiro(false); await recuperar() }
  }

  async function recuperar() {
    if (recuperando || enviando.current) return
    setRecuperando(true)
    try {
      if (incierta) {
        if (!claveIncierta.current) throw new Error('No tenemos la clave de la operación. Consulta los movimientos antes de volver a apostar.')
        const confirmada = await consultarOperacion<PartidaPoker>(claveIncierta.current)
        guardar(await gamesApi.poker.consultar(confirmada.response.partidaId))
        claveIncierta.current = undefined
        setIncierta(false)
      } else {
        const activa = (await gamesApi.poker.activa()).partida
        guardar(activa ?? (partida ? await gamesApi.poker.consultar(partida.partidaId) : null))
      }
      setErrorLocal(null)
      invalidarDatosDeDinero(queryClient)
      void acceso.refetch()
      void rondas.refetch()
    } catch (fallo) { setErrorLocal(fallo instanceof Error ? fallo.message : 'No se pudo recuperar la partida.') }
    finally { setRecuperando(false) }
  }

  if (activaQuery.isPending || acceso.isPending || config.isPending) return <Cargando mensaje="Preparando Poker…" />

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-poker">
      <header className={estilos.cabecera}>
        <p className={estilos.ceja}>TEXAS HOLD’EM · MESA DE CUATRO</p>
        <h1 id="titulo-poker">Poker</h1>
        <p>Juega contra tres oponentes controlados por el servidor. Saldo de simulación.</p>
      </header>

      {(activaQuery.isError || acceso.isError || config.isError) && (
        <Alert tipo="aviso" titulo="No se pudo preparar la mesa">
          {activaQuery.error?.message ?? acceso.error?.message ?? config.error?.message}{' '}
          <Button variante="secundario" onClick={() => { void activaQuery.refetch(); void acceso.refetch(); void config.refetch() }}>Reintentar</Button>{' '}
          <Link to="/billetera">Ir a la billetera</Link>
        </Alert>
      )}
      {incierta && (
        <Alert tipo="aviso" titulo="Acción pendiente de confirmar">
          El servidor podría haberla procesado. No la repitas con una apuesta nueva.{' '}
          <Button variante="secundario" disabled={recuperando} onClick={() => void recuperar()}>Verificar operación</Button>{' '}
          <Link to="/movimientos">Ver movimientos</Link>
        </Alert>
      )}
      {errorLocal && <Alert tipo="error">{errorLocal}</Alert>}

      <div className={estilos.disposicion}>
        <div className={estilos.mesa} aria-busy={bloqueado}>
          <div className={estilos.fieltro}>
            <div className={estilos.oponentes} aria-label="Oponentes de la mesa">
              {oponentes.map((jugador, indice) => (
                <AsientoPoker
                  key={jugador.id}
                  jugador={jugador}
                  turno={partida?.turnoActual === 'BOTS' && jugador.estado === 'ACTIVO'}
                  demora={indice * 100}
                />
              ))}
              {!partida && [0, 1, 2].map((indice) => (
                <div className={estilos.asientoVacio} key={`oponente-${indice}`} aria-label={`Asiento de oponente ${indice + 1}`}>
                  <span aria-hidden="true">♟</span><strong>Bot {indice + 1}</strong><small>Listo para jugar</small>
                </div>
              ))}
              {partida && oponentes.length < 3 && (
                <p className={estilos.avisoAsientos} role="status">La mesa no devolvió todos los asientos. Actualiza la partida para sincronizarla.</p>
              )}
            </div>

            <div className={estilos.centroMesa}>
              <p className={estilos.fase} role="status" aria-live="polite">
                {partida ? `${ETIQUETAS[partida.fase]} · ${partida.estado === 'ACTIVA' ? partida.turnoActual === 'BOTS' || actuar.isPending ? 'los bots responden' : 'tu turno' : tituloResultado(partida)}` : 'La mesa está lista'}
              </p>
              <div className={estilos.comunitarias} role="group" aria-label="Cartas comunitarias">
                {Array.from({ length: 5 }, (_, indice) => (
                  <CartaPoker key={`comun-${indice}-${partida?.comunitarias[indice] ?? 'pendiente'}`} carta={partida?.comunitarias[indice] ?? null} etiqueta={`Comunitaria ${indice + 1}`} demora={indice * 70} />
                ))}
              </div>
              <p className={estilos.bote}>Bote <strong><Money valor={partida?.bote ?? 0} /></strong></p>
            </div>

            {jugadorUsuario ? (
              <AsientoPoker
                jugador={jugadorUsuario}
                esUsuario
                turno={partida?.turnoActual === 'JUGADOR' && partida.estado === 'ACTIVA'}
                demora={320}
              />
            ) : (
              <div className={`${estilos.asientoVacio} ${estilos.asientoUsuario}`}>
                <span aria-hidden="true">♟</span><strong>Tú</strong><small>{partida ? 'Asiento no disponible' : 'Tu asiento'}</small>
                {!partida && <div className={estilos.cartasJugador} role="group" aria-label="Tus cartas">
                  {[0, 1].map((indice) => <CartaPoker key={indice} carta={null} etiqueta={`Tu carta ${indice + 1}`} demora={indice * 80} />)}
                </div>}
              </div>
            )}
          </div>
        </div>

        <aside className={estilos.panel} aria-label="Controles de Poker">
          <h2>Tu partida</h2>
          <p>Saldo de simulación: <strong><Money valor={partida?.saldoActual ?? mesa?.saldo ?? 0} /></strong></p>
          {enCurso && partida ? (
            <>
              <p>Apostado: <strong><Money valor={partida.apuestaTotal} /></strong></p>
              <ol className={estilos.fases} aria-label="Fases de la mano">
                {FASES.map((fase) => <li key={fase} className={fase === partida.fase ? estilos.faseActual : ''} aria-current={fase === partida.fase ? 'step' : undefined}>{ETIQUETAS[fase]}</li>)}
              </ol>
              <p className={estilos.ayuda}>Pasa para ver {SIGUIENTE[partida.fase as (typeof FASES)[number]]}. Subir añade <Money valor={partida.apuestaBase} /> a tu apuesta. Los bots igualan o se retiran automáticamente según sus cartas.</p>
              <div className={estilos.acciones}>
                <Button onClick={() => void enviar('check')} disabled={bloqueado || !partida.accionesPermitidas.includes('check')}>Pasar · ver {SIGUIENTE[partida.fase as (typeof FASES)[number]]}</Button>
                <Button variante="secundario" onClick={() => void enviar('raise')} disabled={bloqueado || !partida.accionesPermitidas.includes('raise')}>Subir <Money valor={partida.apuestaBase} /></Button>
                <Button variante="peligro" onClick={() => setConfirmarRetiro(true)} disabled={bloqueado || !partida.accionesPermitidas.includes('fold')}>Retirarse</Button>
              </div>
              {!partida.accionesPermitidas.includes('raise') && <p className={estilos.ayuda}>Saldo insuficiente para subir; puedes pasar o retirarte.</p>}
            </>
          ) : (
            <>
              {partida?.resultado && (
                <div className={estilos.resultado} role="status">
                  <strong>{tituloResultado(partida)}</strong>
                  {partida.resultado.motivo === 'SHOWDOWN' && <>
                    <p>Tu mejor mano: {partida.resultado.manoJugador}</p>
                    {partida.resultado.ganadores?.length ? (
                      <p>Ganador{partida.resultado.ganadores.length > 1 ? 'es' : ''}: {partida.jugadores?.filter((jugador) => partida.resultado?.ganadores?.includes(jugador.id)).map((jugador) => jugador.tipo === 'HUMANO' ? 'tú' : jugador.nombre).join(', ')}</p>
                    ) : <p>Mejor mano rival: {partida.resultado.manoBanca}</p>}
                  </>}
                  <p>Retorno bruto: <Money valor={partida.resultado.ganancia} /></p>
                  <p>Resultado neto: <Money valor={partida.resultado.gananciaNeta} colorearSigno /></p>
                  <p>Saldo confirmado: <Money valor={partida.saldoActual} /></p>
                </div>
              )}
              <ApuestaForm minimo={minimo} maximo={maximo} saldo={mesa?.saldo ?? 0} deshabilitado={bloqueado || !mesa || !config.data} cargando={iniciar.isPending} boton={partida ? 'Nueva mano' : 'Repartir cartas'} onApostar={empezar} />
            </>
          )}
          <details className={estilos.reglas}>
            <summary>Reglas de esta mesa</summary>
            <p>Texas Hold’em con tres bots. Cada jugador forma la mejor combinación de cinco cartas con sus dos cartas y las comunitarias.</p>
            <ul>{config.data?.reglas.map((regla) => <li key={regla}>{regla}</li>)}</ul>
          </details>
        </aside>
      </div>

      <section className={estilos.historial} aria-labelledby="historial-poker">
        <h2 id="historial-poker">Últimas manos</h2>
        {rondas.isPending ? <Cargando mensaje="Consultando manos…" /> : rondas.isError ? (
          <Alert tipo="error">No se pudo cargar el historial. <Button variante="secundario" onClick={() => void rondas.refetch()}>Reintentar</Button></Alert>
        ) : rondas.data.length === 0 ? <p>Aún no has jugado manos de Poker.</p> : (
          <ul>{rondas.data.map((ronda) => (
            <li key={ronda.id}>
              <span>{formatearFechaHora(ronda.creadaEn)}</span>
              <strong>{ronda.estado === 'ACTIVA' ? 'En curso' : ronda.estado === 'GANADA' ? 'Ganada' : ronda.estado === 'EMPATE' ? 'Empate' : 'Perdida'}</strong>
              <span><Money valor={ronda.ganancia} /></span>
            </li>
          ))}</ul>
        )}
      </section>

      <Modal abierto={confirmarRetiro} alCerrar={() => setConfirmarRetiro(false)} titulo="Retirarte de la mano" pie={<><Button variante="secundario" data-autofoco onClick={() => setConfirmarRetiro(false)}>Seguir jugando</Button><Button variante="peligro" disabled={bloqueado} onClick={() => void enviar('fold')}>Confirmar retirada</Button></>}>
        <p>Perderás lo apostado en esta mano: <Money valor={partida?.apuestaTotal ?? 0} />. Esta acción no se puede deshacer.</p>
      </Modal>
    </section>
  )
}
