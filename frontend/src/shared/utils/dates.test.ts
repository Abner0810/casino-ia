import { describe, expect, it } from 'vitest'
import { finDelDia, inicioDelDia } from './dates'

describe('filtros por día local', () => {
  it('incluye el final del día y conserva la zona al convertir a ISO', () => {
    const inicio = new Date(inicioDelDia('2026-10-19')!)
    const fin = new Date(finDelDia('2026-10-19')!)
    expect(inicio.getHours()).toBe(0)
    expect(fin.getHours()).toBe(23)
    expect(fin.getMinutes()).toBe(59)
    expect(fin.getMilliseconds()).toBe(999)
    expect(fin.getTime() - inicio.getTime()).toBe(86_399_999)
  })
  it('omite campos vacíos', () => {
    expect(inicioDelDia('')).toBeUndefined()
    expect(finDelDia('')).toBeUndefined()
  })
})
