import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import estilos from './Input.module.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  etiqueta: string
  /** Mensaje de error accesible: se vincula al campo con aria-describedby. */
  error?: string
  /** Para vincular un id externo (react-hook-form register). */
  idInterno?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { etiqueta, error, idInterno, className, ...rest },
  ref,
) {
  const idAuto = useId()
  const id = idInterno ?? idAuto
  const idError = `${id}-error`

  return (
    <div className={[estilos.campo, className ?? ''].filter(Boolean).join(' ')}>
      <label className={estilos.etiqueta} htmlFor={id}>
        {etiqueta}
      </label>
      <input
        ref={ref}
        id={id}
        className={estilos.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        {...rest}
      />
      {error && (
        <p id={idError} className={estilos.error}>
          {error}
        </p>
      )}
    </div>
  )
})
