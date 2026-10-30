import { describe, expect, it } from 'vitest'
import {
  RECARGA_MAXIMA,
  RECARGA_MINIMA,
  formatearBs,
  montoATexto,
  validarMontoRecarga,
  validarMontoTexto,
} from './money'

describe('importes compatibles con los DTO', () => {
  it.each(['0', '-1', '1.001', '1e3', 'NaN', 'Infinity', '1,50', '1000000.01', ''])('rechaza %j sin enviarlo al servidor', (texto) => {
    expect(validarMontoTexto(texto)).not.toBeNull()
  })
  it.each(['0.01', '150.50', '1000000', ' 2.5 '])('acepta %j y lo convierte a número JSON', (texto) => {
    expect(validarMontoTexto(texto)).toBeNull()
    expect(Number.isFinite(montoATexto(texto))).toBe(true)
  })
})

describe('recargas con Stripe en bolivianos', () => {
  it('fija el rango 5–500 Bs', () => {
    expect(RECARGA_MINIMA).toBe(5)
    expect(RECARGA_MAXIMA).toBe(500)
  })

  it.each(['5', '10.25', '500', ' 50 '])('acepta %j', (texto) => {
    expect(validarMontoRecarga(texto)).toBeNull()
  })

  it.each(['4.99', '500.01', '0', '-1', '10.001', '50,5', '', 'abc', '1e2'])('rechaza %j', (texto) => {
    expect(validarMontoRecarga(texto)).not.toBeNull()
  })

  it('explica el mínimo y el máximo en bolivianos', () => {
    expect(validarMontoRecarga('4.99')).toContain('Bs 5,00')
    expect(validarMontoRecarga('500.01')).toContain('Bs 500,00')
  })

  it('formatea Bs con dos decimales y separador de miles', () => {
    // Algunos ICU insertan espacio duro; se normaliza para el runner.
    expect(formatearBs(1234.5).replace(/\u00a0/g, ' ')).toBe('Bs 1.234,50')
    expect(formatearBs(5).replace(/\u00a0/g, ' ')).toBe('Bs 5,00')
  })
})
