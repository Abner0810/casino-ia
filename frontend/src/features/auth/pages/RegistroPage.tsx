import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input } from '@/shared/ui'
import { ApiError } from '@/shared/api/errors'
import { aplicarErroresDeApi } from '@/shared/utils/formErrors'
import { useRegistro } from '@/features/auth/auth.hooks'
import { useSession } from '@/features/auth/session.context'
import estilos from './Auth.module.css'

// Reglas alineadas con el DTO del backend (auth.dto.js):
// nombre 2–80, email válido hasta 150, contraseña 8–72.
const esquema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(80, 'El nombre admite máximo 80 caracteres'),
    email: z.email('Ingresa un email válido').max(150, 'El email admite máximo 150 caracteres'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña admite máximo 72 caracteres'),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden',
  })

type Formulario = z.infer<typeof esquema>

export function RegistroPage() {
  const { autenticado } = useSession()
  const registro = useRegistro()
  const navegar = useNavigate()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '', email: '', password: '', confirmacion: '' },
  })

  if (autenticado) return <Navigate to="/inicio" replace />

  const enviar = handleSubmit(async (datos) => {
    setErrorGeneral(null)
    try {
      // El registro NO devuelve tokens: se redirige a login con aviso.
      await registro.mutateAsync({ nombre: datos.nombre, email: datos.email, password: datos.password })
      navegar('/login', { replace: true, state: { registro: true } })
    } catch (error) {
      if (!aplicarErroresDeApi(error, setError)) {
        setErrorGeneral(
          error instanceof ApiError ? error.mensaje : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
        )
      }
    }
  })

  return (
    <section className={estilos.tarjeta} aria-labelledby="titulo-registro">
      <header className={estilos.encabezado}>
        <h1 id="titulo-registro" className={estilos.titulo}>
          Crear cuenta
        </h1>
        <p className={estilos.subtitulo}>
          Empieza con saldo de simulación. No se solicitan datos de pago reales.
        </p>
      </header>

      {errorGeneral && <Alert tipo="error">{errorGeneral}</Alert>}

      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <Input
          etiqueta="Nombre"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          error={errors.nombre?.message}
          {...register('nombre')}
        />
        <Input
          etiqueta="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <p className={estilos.ayudaCampo}>Entre 8 y 72 caracteres. No se recorta ni se modifica lo que escribas.</p>
        <Input
          etiqueta="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmacion?.message}
          {...register('confirmacion')}
        />
        <Button type="submit" ancho cargando={registro.isPending}>
          Crear cuenta
        </Button>
      </form>

      <p className={estilos.pie}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className={estilos.enlace}>
          Inicia sesión
        </Link>
      </p>
    </section>
  )
}
