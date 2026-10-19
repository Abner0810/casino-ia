// Guardia del proyecto Casino IA (plugin de OpenCode V2).
//
// En V2 los hooks viven en plugins, no en opencode.json. Este plugin añade
// avisos y confirmaciones sobre las operaciones sensibles del repo:
//   - Cambios de versiones/dependencias del frontend (el stack está congelado).
//   - `git push` (exige verificación previa y confirmación del usuario).
//   - Instalaciones de paquetes y despliegues a Firebase.
//
// Los hooks de permiso NO son la última línea de defensa de seguridad: son una
// red de seguridad de proceso. Las reglas declarativas de opencode.jsonc siguen
// aplicándose, y un `deny` configurado es definitivo (no llega aquí).

import { Plugin } from '@opencode/plugin'

const ARCHIVO_DE_VERSIONES = /(package\.json|package-lock\.json|npm-shrinkwrap\.json)$/i
const COMANDO_INSTALA = /(^|[\s;&|])(npm|pnpm|yarn|bun)\s+(i|install|add|update|upgrade)\b/i
const COMANDO_PUSH = /\bgit\s+push\b/i
const COMANDO_DEPLOY = /\bfirebase\s+deploy\b/i

export default Plugin.define({
  id: 'casino.guardia',

  async setup(ctx) {
    await ctx.permission.hook('evaluate', (evento) => {
      try {
        const recursos = evento.resources.join(' ')

        if (evento.action === 'edit' && ARCHIVO_DE_VERSIONES.test(recursos)) {
          evento.effect = 'ask'
          evento.message =
            'Versiones y dependencias del frontend están congeladas por ai-context/planfrontend.md. ' +
            'Confirma con el usuario antes de modificar package.json o un lockfile.'
          return
        }

        if (evento.action !== 'shell') return
        const comando = recursos

        if (COMANDO_PUSH.test(comando) && !COMANDO_DEPLOY.test(comando)) {
          evento.effect = 'ask'
          evento.message =
            'Antes de publicar: corre typecheck, lint y tests del frontend, y pide confirmación explícita al usuario ' +
            '(nunca push directo a main).'
          return
        }

        if (COMANDO_INSTALA.test(comando)) {
          evento.effect = 'ask'
          evento.message =
            'Instalación o actualización de dependencias: el stack está fijado en el plan. ' +
            'Confirma antes de instalar algo nuevo o cambiar versiones.'
        }
      } catch (error) {
        // Un fallo del guardia nunca debe bloquear el trabajo del agente.
        console.warn('[casino.guardia] no se pudo evaluar el permiso:', error)
      }
    })
  },
})
