import { evaluateOperation, verifyDependencies, verifyRelease } from '../../scripts/agent-policy.mjs'

// OpenCode V2: el plugin exporta por defecto una definición { id, setup }.
// Plugin.define() de @opencode/plugin es una función identidad, así que no
// hace falta instalar el paquete para un plugin local.
export default {
  id: 'casino-guardia',
  async setup(ctx) {
    await ctx.tool.hook('execute.before', (event) => {
      verifyDependencies()
      const operation = evaluateOperation(event.tool, event.input)
      if (operation.denied) throw new Error(operation.reason)
      if (operation.release) verifyRelease()
    })
    console.log('[casino-guardia] política de integridad activa')
  },
}
