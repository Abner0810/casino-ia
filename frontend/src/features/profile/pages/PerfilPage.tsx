import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input, Money, Skeleton } from '@/shared/ui'
import { ApiError } from '@/shared/api/errors'
import { aplicarErroresDeApi } from '@/shared/utils/formErrors'
import { formatearSoloFecha } from '@/shared/utils/dates'
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
