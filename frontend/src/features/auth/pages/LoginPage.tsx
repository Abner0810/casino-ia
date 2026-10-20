import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input } from '@/shared/ui'
import { ApiError } from '@/shared/api/errors'
import { aplicarErroresDeApi } from '@/shared/utils/formErrors'
import { useLogin } from '@/features/auth/auth.hooks'
import { useSession } from '@/features/auth/session.context'
import estilos from './Auth.module.css'

const esquema = z.object({
  email: z.email('Ingresa un email válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type Formulario = z.infer<typeof esquema>

type EstadoNavegacion = { destino?: string; registro?: boolean }

export function LoginPage() {
  const { autenticado } = useSession()
  const login = useLogin()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const estado = (ubicacion.state ?? null) as EstadoNavegacion | null
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { email: '', password: '' },
  })

  // Si ya hay sesión, no tiene sentido mostrar el formulario.
  if (autenticado) return <Navigate to="/inicio" replace />

  const enviar = handleSubmit(async (datos) => {
    setErrorGeneral(null)
    try {
      await login.mutateAsync(datos)
      const destino = estado?.destino
      navegar(destino && destino.startsWith('/') && !destino.startsWith('//') && !destino.includes('\\') ? destino : '/inicio', { replace: true })
    } catch (error) {
      if (!aplicarErroresDeApi(error, setError)) {
        setErrorGeneral(
          error instanceof ApiError ? error.mensaje : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        )
      }
    }
  })

  return (
    <section className={estilos.tarjeta} aria-labelledby="titulo-login">
      <header className={estilos.encabezado}>
        <h1 id="titulo-login" className={estilos.titulo}>
          Iniciar sesión
        </h1>
        <p className={estilos.subtitulo}>Entra con tu cuenta para jugar con saldo de simulación.</p>
      </header>

      {estado?.registro && <Alert tipo="exito">Cuenta creada correctamente. Ya puedes iniciar sesión.</Alert>}
      {errorGeneral && <Alert tipo="error">{errorGeneral}</Alert>}

      <form className={estilos.formulario} onSubmit={enviar} noValidate>
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" ancho cargando={login.isPending}>
          Entrar
        </Button>
      </form>

      <p className={estilos.pie}>
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className={estilos.enlace}>
          Regístrate
        </Link>
      </p>
      <p className={estilos.nota}>
        Por seguridad, la sesión vive solo en esta pestaña: si recargas la página tendrás que iniciar sesión de nuevo.
      </p>
    </section>
  )
}
