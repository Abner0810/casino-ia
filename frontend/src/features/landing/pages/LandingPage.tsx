import { Link } from 'react-router-dom'
import { useSession } from '@/features/auth/session.context'
import { env } from '@/config/env'
import estilos from './Landing.module.css'

const PASOS = [
  { titulo: 'Crea tu cuenta', texto: 'Registro con email y contraseña. Sin datos de pago.' },
  { titulo: 'Recarga saldo simulado', texto: 'Añade saldo de prueba desde la billetera del simulador.' },
  { titulo: 'Juega y revisa', texto: 'Plinko y Blackjack con resultados del servidor y historial completo.' },
]

export function LandingPage() {
  const { autenticado } = useSession()

  return (
    <div className={estilos.landing}>
      <section className={estilos.hero} aria-labelledby="titulo-principal">
        <p className={estilos.etiqueta}>Simulador educativo · saldo de prueba</p>
        <h1 id="titulo-principal" className={estilos.titulo}>
          {env.appName}: Plinko y Blackjack en un simulador transparente
        </h1>
        <p className={estilos.descripcion}>
          Practica con saldo simulado mientras revisas cada movimiento en tu historial. Los resultados se generan en el
          servidor y quedan auditados: aquí no se juega con dinero real.
        </p>
        <div className={estilos.acciones}>
          {autenticado ? (
            <Link to="/inicio" className={estilos.botonPrimario}>
              Ir a mi panel
            </Link>
          ) : (
            <>
              <Link to="/registro" className={estilos.botonPrimario}>
                Crear cuenta gratis
              </Link>
              <Link to="/login" className={estilos.botonSecundario}>
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="titulo-juegos" className={estilos.seccion}>
        <h2 id="titulo-juegos" className={estilos.tituloSeccion}>
          Dos juegos, reglas claras
        </h2>
        <div className={estilos.rejilla}>
          <article className={estilos.tarjeta}>
            <h3 className={estilos.tarjetaTitulo}>
              <span aria-hidden="true">🔻</span> Plinko
            </h3>
            <p className={estilos.tarjetaTexto}>
              Tres niveles de riesgo (pequeño, mediano y grande) con límites y multiplicadores visibles antes de
              apostar. La trayectoria de la bola proviene de una ronda registrada en el servidor.
            </p>
          </article>
          <article className={estilos.tarjeta}>
            <h3 className={estilos.tarjetaTitulo}>
              <span aria-hidden="true">🃏</span> Blackjack
            </h3>
            <p className={estilos.tarjetaTexto}>
              Mesa completa con pedir, plantarse, dividir y doblar. El crupier planta en 17, el blackjack natural paga
              3:2 y el estado de cada mano vive en el servidor.
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="titulo-pasos" className={estilos.seccion}>
        <h2 id="titulo-pasos" className={estilos.tituloSeccion}>
          Cómo funciona
        </h2>
        <ol className={estilos.pasos}>
          {PASOS.map((paso, indice) => (
            <li key={paso.titulo} className={estilos.paso}>
              <span className={estilos.numeroPaso} aria-hidden="true">
                {indice + 1}
              </span>
              <div>
                <strong className={estilos.pasoTitulo}>{paso.titulo}</strong>
                <p className={estilos.pasoTexto}>{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className={estilos.avisoSaldo}>
        <strong>Saldo de simulación.</strong> Todas las recargas y retiros son operaciones de práctica: no se solicita
        ningún número de tarjeta, cuenta bancaria ni dato de una pasarela de pago.
      </aside>
    </div>
  )
}
