import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContextoSesion } from '@/features/auth/session.context'
import { ApiError } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { PerfilPage } from './PerfilPage'

vi.mock('@/shared/api/http', () => ({ http: vi.fn() }))

const PERFIL = {
  publicId: 'qa-public-id',
  email: 'qa@example.com',
  nombre: 'Usuario QA',
  rol: 'USER' as const,
  wallet: { saldo: 100, bono: 0 },
  creadoEn: '2026-10-19T00:00:00Z',
}

function montar(cerrar = vi.fn(async () => {})) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <ContextoSesion.Provider
        value={{
          usuario: { publicId: 'qa-public-id', nombre: 'Usuario QA', email: 'qa@example.com', rol: 'USER' },
          autenticado: true,
          iniciar: vi.fn(),
          cerrar,
        }}
      >
        <PerfilPage />
      </ContextoSesion.Provider>
    </QueryClientProvider>,
  )
  return { cerrar }
}

/** Abre el modal de cambio de contraseña y devuelve el diálogo. */
async function abrirModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }))
  return screen.getByRole('dialog', { name: 'Cambiar contraseña' })
}

describe('cambio de contraseña desde el perfil', () => {
  it('exige que la confirmación coincida antes de llamar a la API', async () => {
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'users/profile') return PERFIL
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    const user = userEvent.setup()
    montar()
    const modal = await abrirModal(user)

    await user.type(within(modal).getByLabelText('Contraseña actual'), 'clave-vieja-1')
    await user.type(within(modal).getByLabelText('Nueva contraseña'), 'clave-nueva-2')
    await user.type(within(modal).getByLabelText('Repite la nueva contraseña'), 'otra-distinta-3')
    await user.click(within(modal).getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await within(modal).findByText('Las contraseñas no coinciden')).toBeVisible()
    expect(vi.mocked(http).mock.calls.some(([ruta]) => ruta === 'auth/change-password')).toBe(false)
  })

  it('al cambiar la contraseña cierra la sesión local (el servidor revoca todo)', async () => {
    vi.mocked(http).mockImplementation(async (ruta, opciones) => {
      if (ruta === 'users/profile') return PERFIL
      if (ruta === 'auth/change-password') {
        expect(opciones?.body).toEqual({ passwordActual: 'clave-vieja-1', passwordNueva: 'clave-nueva-2' })
        return { mensaje: 'Contraseña actualizada. Inicia sesión de nuevo con la nueva contraseña.' }
      }
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    const user = userEvent.setup()
    const { cerrar } = montar()
    const modal = await abrirModal(user)

    await user.type(within(modal).getByLabelText('Contraseña actual'), 'clave-vieja-1')
    await user.type(within(modal).getByLabelText('Nueva contraseña'), 'clave-nueva-2')
    await user.type(within(modal).getByLabelText('Repite la nueva contraseña'), 'clave-nueva-2')
    await user.click(within(modal).getByRole('button', { name: 'Cambiar contraseña' }))

    await waitFor(() => expect(cerrar).toHaveBeenCalledOnce())
  })

  it('muestra el mensaje del backend si la contraseña actual es incorrecta', async () => {
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'users/profile') return PERFIL
      if (ruta === 'auth/change-password') throw new ApiError({ status: 401, mensaje: 'La contraseña actual no es correcta' })
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    const user = userEvent.setup()
    const { cerrar } = montar()
    const modal = await abrirModal(user)

    await user.type(within(modal).getByLabelText('Contraseña actual'), 'incorrecta-1')
    await user.type(within(modal).getByLabelText('Nueva contraseña'), 'clave-nueva-2')
    await user.type(within(modal).getByLabelText('Repite la nueva contraseña'), 'clave-nueva-2')
    await user.click(within(modal).getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await within(modal).findByText('La contraseña actual no es correcta')).toBeVisible()
    expect(cerrar).not.toHaveBeenCalled()
  })
})
