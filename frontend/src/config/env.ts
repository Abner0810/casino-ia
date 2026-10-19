import { z } from 'zod'

// Las variables VITE_* son PÚBLICAS (viajan al navegador). Solo se valida
// presencia y formato; nunca se guardan secretos aquí.
const esquemaEnv = z.object({
  VITE_API_URL: z.url('VITE_API_URL debe ser una URL válida').optional(),
  VITE_APP_NAME: z.string().min(1).optional(),
})

const parsed = esquemaEnv.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL || undefined,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
})

if (!parsed.success) {
  throw new Error(
    `Configuración inválida en el frontend: ${parsed.error.issues
      .map((i) => `${i.path.join('.') || '(raíz)'} → ${i.message}`)
      .join('; ')}. Copia .env.example a .env.local y completa las variables.`,
  )
}

export const env = {
  /** URL base de la API Express, sin barra final (ej. https://xxx.onrender.com/api) */
  apiUrl: parsed.data.VITE_API_URL?.replace(/\/+$/, '') ?? 'https://backend-pendiente.invalid/api',
  apiConfigured: Boolean(parsed.data.VITE_API_URL),
  appName: parsed.data.VITE_APP_NAME ?? 'Casino IA',
}
