import { describe, expect, it } from 'vitest'
import { montoATexto, validarMontoTexto } from './money'

describe('importes compatibles con los DTO', () => {
  it.each(['0', '-1', '1.001', '1e3', 'NaN', 'Infinity', '1,50', '1000000.01', ''])('rechaza %j sin enviarlo al servidor', (texto) => {
    expect(validarMontoTexto(texto)).not.toBeNull()
  })
  it.each(['0.01', '150.50', '1000000', ' 2.5 '])('acepta %j y lo convierte a número JSON', (texto) => {
    expect(validarMontoTexto(texto)).toBeNull()
    expect(Number.isFinite(montoATexto(texto))).toBe(true)
  })
})
