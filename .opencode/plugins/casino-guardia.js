import { evaluateOperation, verifyDependencies, verifyRelease } from '../../scripts/agent-policy.mjs'
// API oficial de plugins; no requiere instalar paquetes.
export const CasinoGuardia = async () => ({
  'tool.execute.before': async (input, output) => {
    verifyDependencies()
    const operation = evaluateOperation(input.tool, output.args)
    if (operation.denied) throw new Error(operation.reason)
    if (operation.release) verifyRelease()
  },
})
