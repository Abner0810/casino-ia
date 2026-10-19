import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import estilos from './ErrorBoundary.module.css'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Límite de error de la aplicación: evita la pantalla en blanco ante un
 * fallo de renderizado y ofrece reintentar sin recargar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Solo información técnica en consola; nunca tokens ni datos del usuario.
    console.error('Error de renderizado no controlado:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className={estilos.contenedor} role="alert">
          <div className={estilos.tarjeta}>
            <h1 className={estilos.titulo}>Algo salió mal</h1>
            <p className={estilos.texto}>
              La aplicación encontró un error inesperado. Puedes intentarlo de nuevo o volver al inicio.
            </p>
            <div className={estilos.acciones}>
              <button type="button" className={estilos.boton} onClick={() => this.setState({ error: null })}>
                Reintentar
              </button>
              <a className={estilos.enlace} href="/">
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
