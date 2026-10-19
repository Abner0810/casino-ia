import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const frozenFile = /(?:^|[\\/])(package\.json|package-lock\.json|npm-shrinkwrap\.json)$/i
const secretFile = /(?:^|[\\/])\.env(?:\.(?!example$)[^\\/]+)?$/i

export function evaluateOperation(tool, args = {}) {
  const input = typeof args === 'string' ? { command: args } : (args ?? {})
  const command = String(input.command ?? input.cmd ?? input.patchText ?? input.patch ?? '')
  if (/^(?:Bash|bash|shell|exec_command)$/.test(tool)) {
    if (/\b(?:npm|pnpm|yarn|bun)(?:\s+--?[\w=-]+(?:\s+(?!install\b|update\b|add\b|ci\b)[\w./\\:-]+)?)*\s+(?:i|install|add|remove|uninstall|update|upgrade|dedupe)\b/i.test(command)) {
      return { denied: true, reason: 'Stack congelado: restaurar con npm ci; no cambiar dependencias.' }
    }
    return { release: /\bgit\s+(?:-[cC]\s+\S+\s+)*push\b|\bfirebase\s+(?:--[\w-]+(?:=\S+|\s+\S+)?\s+)*deploy\b/.test(command) }
  }
  if (/^(?:apply_patch|patch|Edit|Write|edit|write)$/.test(tool)) {
    const paths = tool === 'apply_patch' || tool === 'patch'
      ? [...command.matchAll(/^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/gm)].map((match) => match[1].trim())
      : [String(input.filePath ?? input.file_path ?? input.path ?? '')]
    if (paths.some((path) => frozenFile.test(`/${path}`) || secretFile.test(`/${path}`))) {
      return { denied: true, reason: 'Archivo protegido: dependencias congeladas y secretos fuera de las ediciones del agente.' }
    }
  }
  return {}
}

export function dependencySnapshot(root = projectRoot) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'frontend/package.json'), 'utf8'))
  const selected = {}
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'engines']) {
    if (manifest[key]) selected[key] = Object.fromEntries(Object.entries(manifest[key]).sort(([a], [b]) => a.localeCompare(b)))
  }
  return {
    manifest: selected,
    lockSha256: createHash('sha256').update(readFileSync(resolve(root, 'frontend/package-lock.json'), 'utf8').replace(/\r\n/g, '\n')).digest('hex'),
  }
}

export function verifyDependencies(root = projectRoot) {
  const baseline = JSON.parse(readFileSync(resolve(root, '.codex/dependency-baseline.json'), 'utf8'))
  if (JSON.stringify(dependencySnapshot(root)) !== JSON.stringify(baseline)) {
    throw new Error('Dependencias o lockfile modificados respecto al commit 75d2fff (frontmedias). Restaurar el stack original antes de publicar.')
  }
}

export function verifyRelease(root = projectRoot, run = spawnSync) {
  verifyDependencies(root)
  for (const task of ['typecheck', 'lint', 'test', 'build']) {
    // Comando fijo: shell en Windows resuelve npm.cmd sin entradas del tool.
    const result = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--prefix', 'frontend', 'run', task], {
      cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: 120000,
    })
    if (result.error || result.status !== 0) {
      throw new Error(`Verificación ${task} falló: ${(result.stderr || result.stdout || result.error?.message || 'sin salida').slice(-5000)}`)
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--release')) verifyRelease()
    else verifyDependencies()
    process.stdout.write('Integridad verificada.\n')
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
