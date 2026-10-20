import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { evaluateStagedFiles, verifyCommitMessage } from './agent-policy.mjs'

const root = process.cwd()
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean)
const files = []
for (const path of staged) {
  const size = Number(git(['cat-file', '-s', `:${path}`]).trim())
  files.push({ path, size, content: size <= 1_000_000 ? git(['show', `:${path}`]) : '' })
}
const blocked = evaluateStagedFiles(files)
if (blocked.denied) {
  process.stderr.write(`${blocked.reason}\n`)
  process.exit(1)
}
if (process.argv[2]) {
  const message = verifyCommitMessage(readFileSync(process.argv[2], 'utf8'))
  if (message.denied) {
    process.stderr.write(`${message.reason}\n`)
    process.exit(1)
  }
}
