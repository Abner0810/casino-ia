import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input, Modal, Money, Skeleton } from '@/shared/ui'
import { ApiError } from '@/shared/api/errors'
import { aplicarErroresDeApi } from '@/shared/utils/formErrors'
import { formatearSoloFecha } from '@/shared/utils/dates'
import { useCambiarPassword } from '@/features/auth/auth.hooks'
import { useEditarPerfil, usePerfil } from '@/features/profile/profile.hooks'
import type { Perfil } from '@/features/profile/profile.api'
import type { Rol } from '@/features/auth/auth.api'
import estilos from './Perfil.module.css'

const ROLES: Record<Rol, string> = {
  USER: 'Usuario',
  ADMIN: 'Administrador',
}

/** Reglas alineadas con el DTO del backend: nombre de 2 a 80 caracteres. */
const esquema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre admite máximo 80 caracteres'),
})

type Formulario = z.infer<typeof esquema>

/** Reglas alineadas con changePasswordDTO del backend. */
const esquemaPassword = z
  .object({
    passwordActual: z.string().min(1, 'La contraseña actual es obligatoria'),
    passwordNueva: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña admite máximo 72 caracteres'),
    confirmacion: z.string().min(1, 'Repite la nueva contraseña'),
  })
  .refine((datos) => datos.passwordNueva === datos.confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmacion'],
  })

type FormularioPassword = z.infer<typeof esquemaPassword>

export function PerfilPage() {
  const perfil = usePerfil()

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-perfil">
      <header className={estilos.encabezado}>
        <h1 id="titulo-perfil" className={estilos.titulo}>
          Perfil
        </h1>
        <p className={estilos.subtitulo}>Datos de tu cuenta y saldo de simulación.</p>
      </header>

      {perfil.isPending ? (
        <div className={estilos.tarjeta} role="status" aria-live="polite">
          <span className="visually-hidden">Cargando perfil…</span>
          <Skeleton ancho="40%" alto="1.5rem" />
          <Skeleton ancho="100%" alto="1rem" />
          <Skeleton ancho="80%" alto="1rem" />
        </div>
      ) : perfil.isError ? (
        <div className={estilos.columnaAcciones}>
          <Alert tipo="error">No se pudo cargar tu perfil.</Alert>
          <Button variante="secundario" cargando={perfil.isFetching} onClick={() => void perfil.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className={estilos.rejilla}>
          <DatosPerfil perfil={perfil.data} />
          <FormularioNombre nombreInicial={perfil.data.nombre} />
          <SeguridadPerfil />
        </div>
      )}
    </section>
  )
}

/** Datos de solo lectura: email, rol, identificador público, alta y wallet. */
function DatosPerfil({ perfil }: { perfil: Perfil }) {
  const [copiado, setCopiado] = useState(false)

  async function copiarPublicId() {
    try {
      await navigator.clipboard.writeText(perfil.publicId)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <section className={estilos.tarjeta} aria-labelledby="titulo-datos">
      <h2 id="titulo-datos" className={estilos.tarjetaTitulo}>
        Datos de la cuenta
      </h2>

      <dl className={estilos.listaDatos}>
        <div className={estilos.dato}>
          <dt>Email (no editable)</dt>
          <dd>{perfil.email}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Rol</dt>
          <dd>{ROLES[perfil.rol]}</dd>
        </div>
        <div className={estilos.dato}>
          <dt>Identificador público</dt>
          <dd className={estilos.publicIdFila}>
            <code className={estilos.codigo} title={perfil.publicId}>
              {perfil.publicId}
            </code>
            <Button
              variante="fantasma"
              onClick={() => void copiarPublicId()}
              aria-label="Copiar identificador público"
            >
              Copiar
            </Button>
            {copiado && (
              <span className={estilos.copiado} role="status">
                Copiado
              </span>
            )}
          </dd>
        </div>
        <div className={estilos.dato}>
          <dt>Fecha de alta</dt>
          <dd>{formatearSoloFecha(perfil.creadoEn)}</dd>
        </div>
      </dl>

      <dl className={estilos.listaDatos}>
        <div className={estilos.dato}>
          <dt>Saldo de simulación</dt>
          <dd>
            <Money valor={perfil.wallet.saldo} />
          </dd>
        </div>
        <div className={estilos.dato}>
          <dt>Bono (no retirable)</dt>
          <dd>
            <Money valor={perfil.wallet.bono} />
          </dd>
        </div>
      </dl>
    </section>
  )
}

/** Edición del nombre con validación local y errores por campo del backend. */
function FormularioNombre({ nombreInicial }: { nombreInicial: string }) {
  const editar = useEditarPerfil()
  const [exito, setExito] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: nombreInicial },
  })

  const enviar = handleSubmit(async ({ nombre }) => {
    setExito(null)
    setErrorGeneral(null)
    try {
      const respuesta = await editar.mutateAsync(nombre)
      setExito(respuesta.mensaje)
      reset({ nombre: respuesta.nombre })
    } catch (error) {
      if (!aplicarErroresDeApi(error, setError)) {
        setErrorGeneral(
          error instanceof ApiError ? error.mensaje : 'No se pudo actualizar el perfil. Inténtalo de nuevo.',
        )
      }
    }
  })

  return (
    <section className={estilos.tarjeta} aria-labelledby="titulo-editar">
      <h2 id="titulo-editar" className={estilos.tarjetaTitulo}>
        Editar perfil
      </h2>
      <p className={estilos.nota}>Solo puedes cambiar tu nombre. El email y el rol no son editables.</p>

      {exito && <Alert tipo="exito">{exito}</Alert>}
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
        <Button type="submit" cargando={editar.isPending} disabled={!isDirty}>
          Guardar cambios
        </Button>
      </form>
    </section>
  )
}

/** Cambio de contraseña: exige la actual, revoca todas las sesiones y obliga a re-loguear. */
function SeguridadPerfil() {
  const cambiar = useCambiarPassword()
  const [abierto, setAbierto] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormularioPassword>({
    resolver: zodResolver(esquemaPassword),
    defaultValues: { passwordActual: '', passwordNueva: '', confirmacion: '' },
  })

  function cerrar() {
    setAbierto(false)
    setErrorGeneral(null)
    reset()
  }

  const enviar = handleSubmit(async (datos) => {
    setErrorGeneral(null)
    try {
      await cambiar.mutateAsync({ passwordActual: datos.passwordActual, passwordNueva: datos.passwordNueva })
      // El hook cerró la sesión (revocada en servidor): queda volver a entrar.
    } catch (error) {
      if (!aplicarErroresDeApi(error, setError)) {
        setErrorGeneral(
          error instanceof ApiError ? error.mensaje : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.',
        )
      }
    }
  })

  return (
    <section className={estilos.tarjeta} aria-labelledby="titulo-seguridad">
      <h2 id="titulo-seguridad" className={estilos.tarjetaTitulo}>
        Seguridad
      </h2>
      <p className={estilos.nota}>
        Cambiar tu contraseña cerrará la sesión en todos tus dispositivos; tendrás que iniciar sesión de nuevo con la
        contraseña nueva.
      </p>
      <Button variante="secundario" onClick={() => setAbierto(true)}>
        Cambiar contraseña
      </Button>

      <Modal
        abierto={abierto}
        alCerrar={cerrar}
        titulo="Cambiar contraseña"
        pie={
          <>
            <Button variante="secundario" onClick={cerrar} disabled={cambiar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" form="form-cambiar-password" cargando={cambiar.isPending}>
              Cambiar contraseña
            </Button>
          </>
        }
      >
        {errorGeneral && <Alert tipo="error">{errorGeneral}</Alert>}

        <form id="form-cambiar-password" className={estilos.formulario} onSubmit={enviar} noValidate>
          <Input
            etiqueta="Contraseña actual"
            type="password"
            autoComplete="current-password"
            data-autofoco
            error={errors.passwordActual?.message}
            {...register('passwordActual')}
          />
          <Input
            etiqueta="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.passwordNueva?.message}
            {...register('passwordNueva')}
          />
          <p className={estilos.ayudaCampo}>Entre 8 y 72 caracteres.</p>
          <Input
            etiqueta="Repite la nueva contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.confirmacion?.message}
            {...register('confirmacion')}
          />
        </form>
      </Modal>
    </section>
  )
}
