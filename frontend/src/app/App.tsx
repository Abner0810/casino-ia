import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Cargando } from '@/shared/ui'
import { PublicLayout } from './layouts/PublicLayout'
import { PrivateLayout } from './layouts/PrivateLayout'
import { RequireAuth } from './guards/RequireAuth'
import { NoEncontradaPage } from './pages/NoEncontrada'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegistroPage } from '@/features/auth/pages/RegistroPage'
import { InicioPage } from '@/features/home/pages/InicioPage'
import { PerfilPage } from '@/features/profile/pages/PerfilPage'
import { BilleteraPage } from '@/features/wallet/pages/BilleteraPage'
import { MovimientosPage } from '@/features/transactions/pages/MovimientosPage'
import { JuegosPage } from '@/features/games/lobby/pages/JuegosPage'

// Los juegos se cargan por ruta: el tablero y la mesa no pesan en el inicio.
const PlinkoPage = lazy(() => import('@/features/games/plinko/pages/PlinkoPage'))
const BlackjackPage = lazy(() => import('@/features/games/blackjack/pages/BlackjackPage'))
const RetornoPagoPage = lazy(() =>
  import('@/features/wallet/pages/RetornoPagoPage').then((modulo) => ({ default: modulo.RetornoPagoPage })),
)

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<PrivateLayout />}>
          <Route path="/inicio" element={<InicioPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/billetera" element={<BilleteraPage />} />
          <Route
            path="/billetera/retorno"
            element={
              <Suspense fallback={<Cargando mensaje="Consultando el pago…" />}>
                <RetornoPagoPage />
              </Suspense>
            }
          />
          <Route path="/movimientos" element={<MovimientosPage />} />
          <Route path="/juegos" element={<JuegosPage />} />
          <Route
            path="/juegos/plinko"
            element={
              <Suspense fallback={<Cargando mensaje="Cargando tablero de Plinko…" />}>
                <PlinkoPage />
              </Suspense>
            }
          />
          <Route
            path="/juegos/blackjack"
            element={
              <Suspense fallback={<Cargando mensaje="Preparando la mesa de Blackjack…" />}>
                <BlackjackPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NoEncontradaPage />} />
    </Routes>
  )
}
