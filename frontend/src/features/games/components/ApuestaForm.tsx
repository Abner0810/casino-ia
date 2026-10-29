import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button, Input } from '@/shared/ui'
import { formatearDinero } from '@/shared/utils/money'

const esquema = z.object({ apuesta: z.coerce.number<number>().finite().positive('Ingresa una apuesta mayor que cero.').multipleOf(0.01, 'Usa como máximo dos decimales.') })
type Valores = z.infer<typeof esquema>

export function ApuestaForm({ minimo, maximo, saldo, deshabilitado, cargando, boton, children, onApostar }: {
  minimo: number
  maximo: number
  saldo: number
  deshabilitado: boolean
  cargando: boolean
  boton: string
  children?: ReactNode
  onApostar: (apuesta: number) => void | Promise<void>
}) {
  const { control, register, handleSubmit, formState: { errors } } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { apuesta: 10 } })
  const monto = useWatch({ control, name: 'apuesta' })
  const errorLimite = !Number.isFinite(monto) ? 'Ingresa un monto válido.' : monto < minimo || monto > maximo
    ? `Apuesta entre ${formatearDinero(minimo)} y ${formatearDinero(maximo)}.`
    : monto > saldo ? 'Saldo insuficiente para esta apuesta.' : null
  const enviar = handleSubmit((valores) => onApostar(valores.apuesta))
  return <form noValidate onSubmit={enviar}>
    <Input etiqueta="Apuesta" type="number" min={minimo} max={maximo} step="0.01" inputMode="decimal" {...register('apuesta', { valueAsNumber: true })} error={errors.apuesta?.message ?? errorLimite ?? undefined} disabled={deshabilitado} />
    <p>Límites: {formatearDinero(minimo)}–{formatearDinero(maximo)}</p>
    {children}
    <Button type="submit" ancho cargando={cargando} disabled={deshabilitado || Boolean(errorLimite)}>{boton}</Button>
  </form>
}
