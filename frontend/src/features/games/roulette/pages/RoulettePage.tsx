import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAccesoJuego, useApostarRuleta, useConfiguracionRuleta, useRondasRuleta } from '@/features/games/games.hooks'
import type { ResultadoRuleta, TipoApuestaRuleta } from '@/features/games/games.api'
import { consultarOperacion } from '@/shared/api/operations'
import { invalidarDatosDeDinero } from '@/shared/api/invalidaciones'
import { ApiError } from '@/shared/api/errors'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { Alert, Button, Cargando, Money } from '@/shared/ui'
import { formatearFechaHora } from '@/shared/utils/dates'
import { ApuestaForm } from '@/features/games/components/ApuestaForm'
import estilos from './RoulettePage.module.css'

const ORDEN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const ANGULO = 360 / ORDEN.length
const DEGRADADO = `conic-gradient(from ${-ANGULO / 2}deg, ${ORDEN.map((numero, indice) => `${numero === 0 ? '#228363' : ROJOS.has(numero) ? '#a83c45' : '#172735'} ${indice * ANGULO}deg ${(indice + 1) * ANGULO}deg`).join(', ')})`
const tipos: { valor: TipoApuestaRuleta; etiqueta: string }[] = [
  { valor: 'pleno', etiqueta: 'Número' },
  { valor: 'color', etiqueta: 'Color' },
  { valor: 'paridad', etiqueta: 'Par o impar' },
  { valor: 'docena', etiqueta: 'Docena' },
  { valor: 'columna', etiqueta: 'Columna' },
]

function opciones(tipo: TipoApuestaRuleta) {
  if (tipo === 'color') return [{ valor: 'rojo', texto: 'Rojo' }, { valor: 'negro', texto: 'Negro' }]
  if (tipo === 'paridad') return [{ valor: 'par', texto: 'Par' }, { valor: 'impar', texto: 'Impar' }]
  if (tipo === 'docena') return [1, 2, 3].map((n) => ({ valor: String(n), texto: `${(n - 1) * 12 + 1}–${n * 12}` }))
  if (tipo === 'columna') return [1, 2, 3].map((n) => ({ valor: String(n), texto: `Columna ${n}` }))
  return ORDEN.slice().sort((a, b) => a - b).map((n) => ({ valor: String(n), texto: String(n) }))
}

function colorNumero(numero: number) { return numero === 0 ? 'verde' : ROJOS.has(numero) ? 'rojo' : 'negro' }

export default function RoulettePage() {
  const acceso = useAccesoJuego('roulette')
  const config = useConfiguracionRuleta()
  const rondas = useRondasRuleta()
  const apostar = useApostarRuleta()
  const queryClient = useQueryClient()
  const reducido = useReducedMotion()
  const [tipo, setTipo] = useState<TipoApuestaRuleta>('color')
  const [seleccion, setSeleccion] = useState('rojo')
  const [resultado, setResultado] = useState<ResultadoRuleta | null>(null)
  const [visible, setVisible] = useState(false)
  const [girando, setGirando] = useState(false)
  const [rotacion, setRotacion] = useState(0)
  const [incierta, setIncierta] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const claveIncierta = useRef<string | undefined>(undefined)
  const enviando = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const accesoMesa = acceso.data?.juego === 'roulette' ? acceso.data : null
  const minimo = config.data?.apuestaMinima ?? accesoMesa?.mesa.apuestaMinima ?? 1
  const maximo = config.data?.apuestaMaxima ?? accesoMesa?.mesa.apuestaMaxima ?? 1000
  const opcionesActuales = useMemo(() => opciones(tipo), [tipo])
  const pendiente = apostar.isPending || girando || incierta

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  function mostrar(res: ResultadoRuleta) {
    setResultado(res)
    setVisible(reducido)
    if (reducido) { setGirando(false); return }
    const indice = ORDEN.indexOf(res.numero)
    const actual = ((rotacion % 360) + 360) % 360
    const destino = (360 - indice * ANGULO) % 360
    const diferencia = (destino - actual + 360) % 360
    setGirando(true)
    setRotacion((prev) => prev + 360 * 5 + diferencia)
    timer.current = window.setTimeout(() => { setGirando(false); setVisible(true) }, 3100)
  }

  async function enviar(apuesta: number) {
    if (enviando.current || pendiente || !accesoMesa || !config.data) return
    enviando.current = true
    setErrorLocal(null)
    setResultado(null)
    setVisible(false)
    try {
      const valor = tipo === 'pleno' || tipo === 'docena' || tipo === 'columna' ? Number(seleccion) : seleccion
      const res = await apostar.mutateAsync({ apuesta, tipo, seleccion: valor })
      mostrar(res)
      void acceso.refetch()
    } catch (fallo) {
      const incierto = !(fallo instanceof ApiError) || fallo.esRed || fallo.status >= 500
      if (incierto) { claveIncierta.current = fallo instanceof ApiError ? fallo.operationKey : undefined; setIncierta(true) }
      setErrorLocal(fallo instanceof Error ? fallo.message : 'No se pudo confirmar el giro.')
    } finally { enviando.current = false }
  }

  async function reconciliar() {
    if (!claveIncierta.current || enviando.current) return
    enviando.current = true
    try {
      const confirmada = await consultarOperacion<ResultadoRuleta>(claveIncierta.current)
      setIncierta(false)
      claveIncierta.current = undefined
      setErrorLocal(null)
      mostrar(confirmada.response)
      invalidarDatosDeDinero(queryClient)
      void acceso.refetch()
      void rondas.refetch()
    } catch (fallo) { setErrorLocal(fallo instanceof Error ? fallo.message : 'La operación sigue pendiente de confirmación.') }
    finally { enviando.current = false }
  }

  if (acceso.isPending || config.isPending) return <Cargando mensaje="Preparando la ruleta…" />
  return <section className={estilos.pagina} aria-labelledby="titulo-ruleta">
    <header className={estilos.cabecera}><p className={estilos.ceja}>MESA EUROPEA · UN SOLO CERO</p><h1 id="titulo-ruleta">Ruleta clásica</h1><p>Elige tu apuesta. La bola y el saldo los resuelve el servidor.</p></header>
    {acceso.isError || config.isError ? <Alert tipo="aviso" titulo="No se pudo preparar la mesa">{acceso.error?.message ?? config.error?.message} <Link to="/billetera">Ir a la billetera</Link> <Button variante="secundario" onClick={() => { void acceso.refetch(); void config.refetch() }}>Reintentar</Button></Alert> : null}
    {incierta && <Alert tipo="aviso" titulo="Giro pendiente de confirmar">No repitas la apuesta: el servidor podría haberla procesado. <Button variante="secundario" onClick={() => void reconciliar()}>Verificar operación</Button> <Link to="/movimientos">Ver movimientos</Link></Alert>}
    {errorLocal && <Alert tipo="error">{errorLocal}</Alert>}
    <div className={estilos.disposicion}>
      <div className={estilos.mesa} aria-busy={girando}>
        <div className={estilos.ruedaMarco}><span className={estilos.flecha} aria-hidden="true">▼</span><div className={estilos.rueda} style={{ transform: `rotate(${rotacion}deg)`, transitionDuration: reducido ? '0ms' : '3000ms', background: DEGRADADO }} aria-hidden="true">{ORDEN.map((numero, indice) => <span key={numero} className={estilos.sector} style={{ transform: `rotate(${indice * ANGULO}deg) translateY(var(--sector-radius)) rotate(${-indice * ANGULO}deg)` }}>{numero}</span>)}<span className={estilos.centro}>0–36</span></div></div>
        <p className={estilos.estado} role="status" aria-live="polite">{girando ? 'La ruleta está girando…' : visible && resultado ? `Salió ${resultado.numero} ${resultado.color}. ${resultado.ganancia > 0 ? 'Premio' : 'Sin premio'}.` : 'Selecciona una apuesta para girar.'}</p>
        {visible && resultado && <div className={estilos.resultado}><strong className={`${estilos.numeroResultado} ${estilos[resultado.color]}`}>{resultado.numero}</strong><div><p>{resultado.color.toUpperCase()} · {resultado.multiplicador}×</p><p>Retorno bruto <Money valor={resultado.ganancia} /></p><p>Resultado neto <Money valor={resultado.gananciaNeta} colorearSigno /></p><p>Saldo confirmado <Money valor={resultado.saldoActual} /></p></div></div>}
      </div>
      <aside className={estilos.panel} aria-label="Controles de ruleta"><h2>Tu apuesta</h2><p>Saldo de simulación: <strong><Money valor={accesoMesa?.saldo ?? 0} /></strong></p><ApuestaForm minimo={minimo} maximo={maximo} saldo={accesoMesa?.saldo ?? 0} deshabilitado={pendiente || !config.data || !accesoMesa} cargando={apostar.isPending} boton="Girar ruleta" onApostar={enviar}>
        <label htmlFor="tipo-ruleta">Tipo de apuesta</label><select id="tipo-ruleta" value={tipo} disabled={pendiente} onChange={(e) => { const siguiente = e.target.value as TipoApuestaRuleta; setTipo(siguiente); setSeleccion(opciones(siguiente)[0].valor) }}>{tipos.map((actual) => <option key={actual.valor} value={actual.valor}>{actual.etiqueta} · {config.data?.pagos[actual.valor] ?? '—'}×</option>)}</select>
        <fieldset disabled={pendiente} className={estilos.seleccion}><legend>Elige {tipos.find((actual) => actual.valor === tipo)?.etiqueta.toLowerCase()}</legend><div className={tipo === 'pleno' ? estilos.numeros : estilos.opciones}>{opcionesActuales.map((opcion) => <label key={opcion.valor} className={`${estilos.opcion} ${tipo === 'pleno' ? estilos[colorNumero(Number(opcion.valor))] : ''} ${seleccion === opcion.valor ? estilos.elegida : ''}`}><input type="radio" name="seleccion-ruleta" value={opcion.valor} checked={seleccion === opcion.valor} onChange={() => setSeleccion(opcion.valor)} /><span>{opcion.texto}</span></label>)}</div></fieldset>
      </ApuestaForm><details><summary>Reglas y pagos</summary><p>El 0 verde pierde color, paridad, docenas y columnas. El multiplicador incluye la apuesta original. Los resultados son de simulación.</p></details></aside>
    </div>
    <section className={estilos.historial} aria-labelledby="rondas-ruleta"><h2 id="rondas-ruleta">Últimos giros</h2>{rondas.isPending ? <Cargando mensaje="Consultando giros…" /> : rondas.isError ? <Alert tipo="error">No se pudieron consultar los giros. <Button variante="secundario" onClick={() => void rondas.refetch()}>Reintentar</Button></Alert> : rondas.data.length === 0 ? <p>Aún no tienes giros.</p> : <ul>{rondas.data.map((ronda) => <li key={ronda.id}><span className={`${estilos.chip} ${estilos[ronda.color]}`}>{ronda.numero}</span><span>{formatearFechaHora(ronda.fecha)} · {ronda.tipo} {ronda.seleccion}</span><strong><Money valor={ronda.ganancia} /></strong></li>)}</ul>}</section>
  </section>
}
