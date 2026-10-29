import { Link } from 'react-router-dom'
import estilos from './Juegos.module.css'

// Descripción y reglas fijas para el lobby: no se pide acceso a cada juego
// aquí para no mostrar un error de "saldo insuficiente" antes de entrar.
const JUEGOS = [
  {
    id: 'plinko',
    titulo: 'Plinko',
    descripcion: 'Suelta una bola y deja que rebote entre las clavijas hasta caer en una de las diez casillas.',
    reglas: [
      'Elige un riesgo (Pequeño, Mediano o Grande): cada uno tiene sus propios límites y multiplicadores.',
      'La bola recorre nueve filas de clavijas; cada desvío a la derecha la acerca a un extremo de premio alto.',
      'El retorno bruto es apuesta × multiplicador y el resultado neto descuenta tu apuesta.',
    ],
    ruta: '/juegos/plinko',
  },
  {
    id: 'blackjack',
    titulo: 'Blackjack',
    descripcion: 'Acércate a 21 sin pasarte y juega tu mano contra el crupier.',
    reglas: [
      'El crupier planta en 17 y el blackjack natural paga 3:2.',
      'Puedes pedir, plantarte, doblar, dividir (hasta 3 manos) o rendirte.',
      'Rendirte devuelve el 50% de la apuesta total y salir de la página no liquida la partida.',
    ],
    ruta: '/juegos/blackjack',
  },
  {
    id: 'ruleta',
    titulo: 'Ruleta clásica',
    descripcion: 'Apuesta en una ruleta europea de 37 casillas y observa dónde se detiene la bola.',
    reglas: [
      'Apuesta a un número, color, paridad, docena o columna.',
      'El 0 es verde y pierde las apuestas externas.',
      'Cada giro y premio lo decide el servidor.',
    ],
    ruta: '/juegos/ruleta',
  },
  {
    id: 'poker',
    titulo: 'Poker',
    descripcion: 'Texas Hold’em contra la banca con dos cartas propias y cinco comunitarias.',
    reglas: [
      'Tu apuesta inicial abre la mano; puedes pasar, subir una apuesta o retirarte en cada fase.',
      'Se revelan flop, turn y river. La mejor combinación de cinco cartas decide el resultado.',
      'Al ganar recibes el bote; un empate devuelve lo apostado. Todo el saldo es simulado.',
    ],
    ruta: '/juegos/poker',
  },
] as const

export function JuegosPage() {
  return (
    <section className={estilos.pagina} aria-labelledby="titulo-juegos">
      <header className={estilos.encabezado}>
        <h1 id="titulo-juegos" className={estilos.titulo}>
          Juegos
        </h1>
        <p className={estilos.subtitulo}>
          Elige un juego para practicar. Todo el saldo es simulado: no se maneja dinero real.
        </p>
      </header>

      <ul className={estilos.rejilla} role="list">
        {JUEGOS.map((juego) => (
          <li key={juego.id}>
            <article className={estilos.tarjeta} aria-labelledby={`titulo-${juego.id}`}>
              <h2 id={`titulo-${juego.id}`} className={estilos.nombre}>
                {juego.titulo}
              </h2>
              <p className={estilos.descripcion}>{juego.descripcion}</p>

              <h3 className={estilos.reglasTitulo}>Reglas</h3>
              <ul className={estilos.reglas} role="list">
                {juego.reglas.map((regla) => (
                  <li key={regla}>{regla}</li>
                ))}
              </ul>

              <Link to={juego.ruta} className={estilos.enlace}>
                Jugar {juego.titulo}
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
