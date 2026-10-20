// Fechas: el servidor envía ISO con zona; en UI se muestra en la zona local
// del usuario y los filtros por día cubren el día COMPLETO elegido.

const formatoFechaHora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const formatoSoloFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' })

export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? '—' : formatoFechaHora.format(fecha)
}

export function formatearSoloFecha(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? '—' : formatoSoloFecha.format(fecha)
}

/** 'YYYY-MM-DD' (input type=date) → ISO del inicio de ese día en zona local. */
export function inicioDelDia(dia: string): string | undefined {
  if (!dia) return undefined
  const fecha = new Date(`${dia}T00:00:00`)
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString()
}

/** 'YYYY-MM-DD' → ISO del FINAL de ese día (incluye todo el día elegido). */
export function finDelDia(dia: string): string | undefined {
  if (!dia) return undefined
  const fecha = new Date(`${dia}T23:59:59.999`)
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString()
}

/** Zona horaria del usuario, para exponerla junto a los filtros de fecha. */
export function zonaHorariaLocal(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
