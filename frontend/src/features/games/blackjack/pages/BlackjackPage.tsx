import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/session.context'
import { useAccesoJuego, useAccionBlackjack, useIniciarBlackjack, useRondasBlackjack } from '@/features/games/games.hooks'
import type { AccionBlackjack, PartidaBlackjack } from '@/features/games/games.api'
import { gamesApi } from '@/features/games/games.api'
import { ApiError } from '@/shared/api/errors'
import { consultarOperacion } from '@/shared/api/operations'
import { Alert, Button, Cargando, Input, Modal, Money } from '@/shared/ui'
import { formatearDinero, montoATexto, validarMontoTexto } from '@/shared/utils/money'
import { formatearFechaHora } from '@/shared/utils/dates'
import { ETIQUETA_ESTADO_MANO, ETIQUETA_ESTADO_PARTIDA } from '../blackjack.constantes'
import estilos from './BlackjackPage.module.css'

function Cartas({ cartas }: { cartas: string[] }) {
  return <ul className={estilos.cartas} aria-label="Cartas de la mano">
    {cartas.map((carta, indice) => {
      const oculta = carta === '🂠'
      const nombre = oculta ? 'Carta oculta' : carta
      const rango = oculta ? '' : carta.slice(0, -1)
      const palo = oculta ? '' : carta.slice(-1)
      return <li key={indice} className={`${estilos.carta} ${/[♥♦]/u.test(carta) ? estilos.roja : ''}`}>
        <svg viewBox="0 0 58 82" role="img" aria-label={nombre} className={estilos.cartaSvg}>
          <title>{nombre}</title>
          <rect x="1" y="1" width="56" height="80" rx="5" fill="#f8f5e9" />
          {oculta ? <>
            <rect x="4" y="4" width="50" height="74" rx="3" fill="#183b67" />
            <path d="M8 10H50V72H8Z M12 14H46V68H12Z M29 22L43 41L29 60L15 41Z" fill="none" stroke="#d8c083" strokeWidth="1.5" />
            <path d="M29 30L35 41L29 52L23 41Z" fill="#d8c083" />
          </> : <g fill="currentColor" fontFamily="Georgia, serif">
            <text x="6" y="17" fontSize="13" fontWeight="700">{rango}</text>
            <text x="29" y="53" textAnchor="middle" fontSize="32">{palo}</text>
            <text x="6" y="17" fontSize="13" fontWeight="700" transform="rotate(180 29 41)">{rango}</text>
          </g>}
        </svg>
      </li>
    })}
  </ul>
}

export default function BlackjackPage() {
  const { usuario } = useSession()
  return <MesaBlackjack key={usuario?.publicId} usuarioId={usuario?.publicId ?? 'sin-sesion'} />
}

function MesaBlackjack({ usuarioId }: { usuarioId: string }) {
  const queryClient = useQueryClient()
  const claveMesa = ['blackjack', 'mesa', usuarioId]
  const consultaMesa = useQuery({ queryKey: claveMesa, queryFn: gamesApi.blackjack.activa, staleTime: 0, retry: false })
  const acceso = useAccesoJuego('blackjack')
  const historial = useRondasBlackjack()
  const iniciar = useIniciarBlackjack()
  const actuar = useAccionBlackjack()
  const [incierta, setIncierta] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [texto, setTexto] = useState('')
  const [tocado, setTocado] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // El ref bloquea dos eventos en el mismo render, antes de isPending.
  const enviando = useRef(false)
  const ultimaPartidaEnviada = useRef<string | null>(null)
  const operacionPendiente = useRef<{ requiereConfirmacion: boolean; key?: string }>({ requiereConfirmacion: false })
  const partida = consultaMesa.data?.partida ?? null
  const mesaConfig = acceso.data?.juego === 'blackjack' ? acceso.data : null
  const activa = partida?.estado === 'ACTIVA'
  const indiceActivo = partida?.indiceManoActiva ?? -1
  const mano = partida?.manos[indiceActivo]
  const pendiente = iniciar.isPending || actuar.isPending
  const desincronizada = Boolean(activa && historial.data?.some((ronda) => ronda.id === partida?.partidaId && ronda.estado !== 'ACTIVA'))
  const otraActiva = historial.data?.some((ronda) => ronda.estado === 'ACTIVA' && ronda.id !== partida?.partidaId) ?? false
  const bloqueado = pendiente || incierta || desincronizada || recuperando || consultaMesa.isFetching || !consultaMesa.isSuccess
  const saldo = partida?.saldoActual ?? mesaConfig?.saldo
  const puedeDoblar = partida?.accionesPermitidas.includes('double') ?? false
  const puedeDividir = partida?.accionesPermitidas.includes('split') ?? false
  let errorApuesta = validarMontoTexto(texto)
  if (!errorApuesta && mesaConfig) {
    const monto = montoATexto(texto)
    if (monto < mesaConfig.mesa.apuestaMinima || monto > mesaConfig.mesa.apuestaMaxima) errorApuesta = `Apuesta entre ${formatearDinero(mesaConfig.mesa.apuestaMinima)} y ${formatearDinero(mesaConfig.mesa.apuestaMaxima)}.`
    else if (monto > mesaConfig.saldo) errorApuesta = 'El saldo disponible es insuficiente.'
  }

  function guardar(siguiente: PartidaBlackjack | null) {
    queryClient.setQueryData(claveMesa, { partida: siguiente })
  }

  async function recuperar() {
    if (enviando.current || recuperando) return
    setRecuperando(true)
    setError(null)
    try {
      if (operacionPendiente.current.requiereConfirmacion) {
        const key = operacionPendiente.current.key
        if (!key) throw new Error('La operación sigue sin confirmarse. Mantén la mesa bloqueada y consulta sus movimientos.')
        // Un GET de partida puede terminar antes de que confirme el POST original.
        // Solo la operación exacta confirmada permite liberar otra mutación.
        const confirmada = await consultarOperacion<PartidaBlackjack>(key)
        const actual = await gamesApi.blackjack.consultar(confirmada.response.partidaId)
        guardar(actual)
        operacionPendiente.current = { requiereConfirmacion: false }
        setIncierta(false)
        void historial.refetch()
        void acceso.refetch()
        return
      }
      const enCurso = (await gamesApi.blackjack.activa()).partida
      const id = incierta ? ultimaPartidaEnviada.current : partida?.partidaId
      const actual = enCurso ?? (id ? await gamesApi.blackjack.consultar(id) : null)
      // Un start perdido pudo resolver un natural sin dejar una partida activa.
      const rondas = await historial.refetch()
      const ultima = rondas.data?.[0]
      guardar(actual ?? (incierta && ultima ? await gamesApi.blackjack.consultar(ultima.id) : null))
      setIncierta(false)
      void acceso.refetch()
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo recuperar la mesa.')
    } finally { setRecuperando(false) }
  }

  async function enviar(accion?: AccionBlackjack) {
    if (enviando.current || bloqueado || (accion ? !activa || !partida?.accionesPermitidas.includes(accion) : activa || otraActiva || Boolean(errorApuesta) || !historial.isSuccess || !mesaConfig)) return
    enviando.current = true
    setError(null)
    setConfirmarSalida(false)
    ultimaPartidaEnviada.current = accion ? partida?.partidaId ?? null : null
    operacionPendiente.current = { requiereConfirmacion: false }
    try {
      const respuesta = accion && partida
        ? await actuar.mutateAsync({ partidaId: partida.partidaId, accion, version: partida.version })
        : await iniciar.mutateAsync(montoATexto(texto))
      guardar(respuesta)
      setIncierta(false)
      void acceso.refetch()
    } catch (fallo) {
      const requiereConfirmacion = !(fallo instanceof ApiError) || fallo.esRed || fallo.status >= 500
      operacionPendiente.current = { requiereConfirmacion, key: fallo instanceof ApiError ? fallo.operationKey : undefined }
      const incierta = requiereConfirmacion || fallo instanceof ApiError && (fallo.status === 404 || fallo.status === 409)
      setIncierta(incierta)
      setError(fallo instanceof Error ? fallo.message : 'No se pudo completar la solicitud.')
      void historial.refetch()
    } finally {
      enviando.current = false
    }
  }

  if ((acceso.isPending || consultaMesa.isPending) && !partida) return <Cargando mensaje="Preparando la mesa de Blackjack…" />

  return <section className={estilos.pagina} aria-labelledby="titulo-blackjack">
    <header><p className={estilos.eyebrow}>MESA CLÁSICA · 6 MAZOS</p><h1 id="titulo-blackjack">Blackjack</h1><p className={estilos.muted}>Acércate a 21. El crupier se planta en 17. Juegas con saldo simulado.</p></header>
    <p role="status" aria-live="polite" className="visually-hidden">{partida ? `Estado: ${ETIQUETA_ESTADO_PARTIDA[partida.estado]}. ${activa ? `Turno de la mano ${indiceActivo + 1}, total ${mano?.valor ?? 0}.` : ''}` : ''}</p>
    {(incierta || desincronizada || otraActiva || consultaMesa.isError) && <Alert tipo="aviso" titulo="La partida necesita verificación">
      {incierta ? 'No pudimos confirmar la última operación. No la repitas: pudo procesarse en el servidor.' : 'Consulta el estado actual para sincronizar la mesa.'} Las acciones permanecerán bloqueadas hasta recuperar el estado confirmado.
      <p><Link to="/movimientos">Ver movimientos</Link> · <Button variante="secundario" cargando={recuperando} onClick={() => void recuperar()}>Recuperar mesa</Button></p>
    </Alert>}
    {error && <Alert tipo="error" titulo="No se pudo confirmar la acción">{error}</Alert>}
    {acceso.isError && <Alert tipo="aviso" titulo="Acceso a la mesa">{acceso.error.message} <Link to="/billetera">Ir a la billetera</Link> <Button variante="secundario" onClick={() => void acceso.refetch()}>Consultar acceso</Button></Alert>}
    <div className={estilos.disposicion}>
      <div className={estilos.mesa} aria-busy={pendiente}>
        <div className={estilos.crupier}><h2>Crupier</h2>{partida ? <><Cartas cartas={partida.dealer.cartas} /><p>{activa ? 'Valor visible' : 'Total'}: <strong>{partida.dealer.totalVisible}</strong></p></> : <p className={estilos.muted}>Las cartas se reparten al iniciar una partida.</p>}</div>
        <p className={estilos.inscripcion}>BLACKJACK PAGA 3:2</p>
        <div className={estilos.manos}>{partida?.manos.map((actual, indice) => <article key={indice} className={`${estilos.mano} ${activa && indice === indiceActivo ? estilos.manoActiva : ''}`} aria-label={`Mano ${indice + 1}${activa && indice === indiceActivo ? ', turno actual' : ''}`}>
          <h2>Mano {indice + 1} {activa && indice === indiceActivo && <span className={estilos.turno}>Tu turno</span>}</h2>
          <Cartas cartas={actual.cartas} /><p>Total: <strong>{actual.valor}</strong> · {ETIQUETA_ESTADO_MANO[actual.estado]}</p><p>Apuesta: <Money valor={actual.apuesta} /></p>
          {!activa && actual.ganancia !== null && <p>Retorno bruto: <Money valor={actual.ganancia} /></p>}
        </article>)}</div>
        {partida && <p className={estilos.muted}>{partida.cartasRestantes} cartas restantes en el mazo</p>}
      </div>
      <aside className={estilos.panel} aria-label="Controles de la mesa">
        <div><h2>Tu mesa</h2><p className={estilos.muted}>Saldo disponible</p>{saldo !== undefined ? <strong className={estilos.saldo}><Money valor={saldo} /></strong> : <span>Sin confirmar</span>}</div>
        {activa ? <><p>Apuesta total: <Money valor={partida.apuestaTotal} /></p><div className={estilos.acciones}>
          <Button ancho disabled={bloqueado || !mano || !partida.accionesPermitidas.includes('hit')} onClick={() => void enviar('hit')}>Pedir carta</Button>
          <Button ancho variante="secundario" disabled={bloqueado || !mano || !partida.accionesPermitidas.includes('stand')} onClick={() => void enviar('stand')}>Plantarse</Button>
          <Button ancho variante="secundario" disabled={bloqueado || !puedeDoblar || acceso.isFetching} onClick={() => void enviar('double')}>Doblar apuesta</Button>
          <Button ancho variante="secundario" disabled={bloqueado || !puedeDividir || acceso.isFetching} onClick={() => void enviar('split')}>Dividir par</Button>
          <Button ancho variante="peligro" disabled={bloqueado || !partida.accionesPermitidas.includes('exit')} onClick={() => setConfirmarSalida(true)}>Rendirse</Button>
        </div><p className={estilos.muted}>Doblar requiere dos cartas y saldo para igualar tu apuesta. Puedes dividir pares del mismo valor hasta un máximo de tres manos.</p></> : <form noValidate className={estilos.acciones} onSubmit={(evento) => { evento.preventDefault(); setTocado(true); void enviar() }}>
          <Input etiqueta="Apuesta" inputMode="decimal" autoComplete="off" placeholder="0.00" value={texto} onChange={(evento) => setTexto(evento.target.value)} onBlur={() => setTocado(true)} error={tocado ? errorApuesta ?? undefined : undefined} disabled={bloqueado || otraActiva} />
          {mesaConfig && <p className={estilos.muted}>Límites: {formatearDinero(mesaConfig.mesa.apuestaMinima)} – {formatearDinero(mesaConfig.mesa.apuestaMaxima)}</p>}
          <Button type="submit" ancho cargando={pendiente} disabled={bloqueado || otraActiva || Boolean(errorApuesta) || !mesaConfig || !historial.isSuccess || acceso.isFetching}>{partida ? 'Nueva partida' : 'Repartir cartas'}</Button>
        </form>}
        {pendiente && <p role="status">Esperando confirmación del servidor…</p>}
        {partida && !activa && <div className={estilos.resultado} role="status"><h2>{ETIQUETA_ESTADO_PARTIDA[partida.estado]}</h2><p>Apuesta total: <Money valor={partida.apuestaTotal} /></p>{partida.estado === 'RENDIDA' && partida.devuelto !== undefined ? <p>Devuelto: <Money valor={partida.devuelto} /></p> : <p>El retorno bruto de cada mano incluye la apuesta recuperada. Consulta el saldo confirmado arriba.</p>}</div>}
        <details className={estilos.reglas}><summary>Reglas de la mesa</summary><ul><li>Crupier se planta en todos los 17.</li><li>Blackjack natural paga 3:2; victoria normal, 1:1; empate devuelve la apuesta.</li><li>Ases divididos reciben una carta por mano y se plantan.</li><li>Doblar añade una apuesta igual, recibe una carta y planta.</li><li>Rendirse devuelve el 50% de la apuesta total.</li></ul></details>
      </aside>
    </div>
    <section className={estilos.historial} aria-labelledby="historial-blackjack"><h2 id="historial-blackjack">Últimas partidas</h2>
      {historial.isPending ? <Cargando mensaje="Consultando partidas…" /> : historial.isError ? <Alert tipo="error" titulo="No se pudo cargar el historial">{historial.error.message} <Button variante="secundario" onClick={() => void historial.refetch()}>Consultar historial</Button></Alert> : !historial.data.length ? <p className={estilos.muted}>Todavía no tienes partidas. Tu primera mesa te espera.</p> : <div className={estilos.tablaScroll}><table><caption className="visually-hidden">Diez partidas más recientes de Blackjack</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Apuesta inicial</th><th scope="col">Estado</th></tr></thead><tbody>{historial.data.map((ronda) => <tr key={ronda.id}><td>{formatearFechaHora(ronda.creadaEn)}</td><td><Money valor={ronda.apuesta} /></td><td>{ETIQUETA_ESTADO_PARTIDA[ronda.estado]}</td></tr>)}</tbody></table></div>}
    </section>
    <Modal abierto={confirmarSalida} alCerrar={() => setConfirmarSalida(false)} titulo="Rendirse y cerrar la partida" pie={<><Button variante="secundario" data-autofoco onClick={() => setConfirmarSalida(false)}>Seguir jugando</Button><Button variante="peligro" disabled={bloqueado} onClick={() => void enviar('exit')}>Confirmar rendición</Button></>}><p>Se cerrarán todas tus manos. El servidor devolverá el 50% de la apuesta total de <Money valor={partida?.apuestaTotal ?? 0} />. Esta acción no se puede deshacer.</p></Modal>
  </section>
}
