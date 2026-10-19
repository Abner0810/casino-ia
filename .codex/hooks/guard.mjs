import { readFileSync } from 'node:fs'
import { evaluateOperation, verifyDependencies, verifyRelease } from '../../scripts/agent-policy.mjs'
try {
  const event = JSON.parse(readFileSync(0, 'utf8'))
  verifyDependencies()
  if (event.hook_event_name === 'SessionStart') {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: {
      hookEventName: 'SessionStart', additionalContext: 'Casino IA: leer AGENTS.md; stack congelado verificado. Delegar agentes con archivos asignados y ejecutar QA antes de publicar.',
    } }))
  } else {
    const operation = evaluateOperation(event.tool_name, event.tool_input)
    if (operation.denied) throw new Error(operation.reason)
    if (operation.release) verifyRelease()
    process.stdout.write('{}')
  }
} catch (error) {
  process.stderr.write(`[casino.guardia] ${error.message}\n`)
  process.exitCode = 2
}
