import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('confirmación de operaciones', () => {
  it('contiene el foco, permite Escape y devuelve el foco al disparador', async () => {
    const user = userEvent.setup()
    const cerrar = vi.fn()
    const disparador = document.createElement('button')
    document.body.append(disparador)
    disparador.focus()
    const vista = render(<Modal abierto alCerrar={cerrar} titulo="Confirmar retiro" pie={<button>Confirmar</button>}>Saldo simulado</Modal>)
    expect(screen.getByRole('dialog', { name: 'Confirmar retiro' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cerrar diálogo' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(cerrar).toHaveBeenCalledOnce()
    vista.unmount()
    expect(disparador).toHaveFocus()
    disparador.remove()
  })
})
