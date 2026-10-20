import { readFileSync } from 'node:fs'
import { verifyCommitMessage } from './agent-policy.mjs'

try {
  if (!process.argv[2]) throw new Error('Git debe proporcionar el archivo del mensaje a commit-msg.')
  const result = verifyCommitMessage(readFileSync(process.argv[2], 'utf8'))
  if (result.denied) throw new Error(result.reason)
} catch (error) {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
}
