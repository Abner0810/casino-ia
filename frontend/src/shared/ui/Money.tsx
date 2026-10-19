import estilos from './Money.module.css'
import { formatearDinero } from '@/shared/utils/money'

type Props = {
  valor: number
  /** Colorea según signo (saldos y resultados). */
  colorearSigno?: boolean
  className?: string
}

/** Importes formateados con dos decimales y sin símbolo de moneda. */
export function Money({ valor, colorearSigno = false, className }: Props) {
  const clases = [
    estilos.monto,
    colorearSigno ? (valor > 0 ? estilos.positivo : valor < 0 ? estilos.negativo : '') : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={clases}>
      {valor > 0 && colorearSigno ? '+' : ''}
      {formatearDinero(valor)}
    </span>
  )
}
