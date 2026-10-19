import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { ErrorBoundary } from './app/ErrorBoundary'
import App from './app/App'
import './styles/reset.css'
import './styles/global.css'

const contenedor = document.getElementById('root')
if (!contenedor) throw new Error('No se encontró el nodo #root para montar la aplicación')

createRoot(contenedor).render(
  <StrictMode>
    <AppProviders>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </AppProviders>
  </StrictMode>,
)
