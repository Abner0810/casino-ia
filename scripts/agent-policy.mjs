import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const frozenFile = /(?:^|[\\/])(package\.json|package-lock\.json|npm-shrinkwrap\.json)$/i
const secretFile = /(?:^|[\\/])\.env(?:\.(?!example$)[^\\/]+)?$/i
const sensitiveFile = /(?:^|[\\/])(?:node_modules|dist|build|coverage)(?:[\\/]|$)|\.(?:log|pem|key|p12|keystore|sqlite|db|dump|zip|rar)$/i
const credentialFile = /(?:^|[\\/])(?:credentials[^\\/]*\.json|service-account[^\\/]*\.json|id_rsa[^\\/]*)$/i
const secretScanExempt = /(?:^|[\\/])(?:[^\\/]*\.(?:example|test|spec)\.[^\\/]+|(?:tests?|__tests__|__mocks__)[\\/])/i
const heavyLimit = 1_000_000

const MAIN_PUSH_REASON = '⛔ Este hook evita pushear a main. Sigue el git flow: dev → qa → main vía PR.'
const COMMIT_FORMAT_REASON = 'Formato de commit: usa «tipo(scope): mensaje» — por ejemplo «feat(wallet): añade validación de monto». Tipos: feat, fix, docs, ci, chore, refactor, test, style, perf, revert.'
const COMMIT_CONVENTION = /^(?:feat|fix|docs|ci|chore|refactor|test|style|perf|revert)(?:\([a-z0-9-]+\))?:\s+\S/
const GIT_GENERATED = /^(?:Merge\b|Revert\b|fixup!|squash!)/
const FILE_REASON = (file) => `Archivo sensible o pesado bloqueado: ${file}. No se versionan .env reales, node_modules, builds, llaves, credenciales ni binarios > 1 MB; usar .gitignore y git rm --cached si ya está en el índice.`
const SECRET_REASON = (kind) => `Posible ${kind} detectado en el contenido. No versionar secretos: usar variables de entorno, secretos de GitHub o el dashboard de Render.`

// Valores que parecen marcadores de ejemplo en vez de secretos reales.
const BENIGN_VALUE = /^(?:<|\$\{|…|\.{2,}|TU-|tu-|cambia-|REEMPLAZAR|ci-access-secret|ci-refresh-secret|ci-test-|integration-only-|dummy|example|placeholder|cambiame|cambiar|xxx+|\*+)/i
const BENIGN_URL = /(?:USER:PASSWORD|user:password|casino_test:casino_test@|postgres:postgres@|\.\.\.|<|\$\{)/

function segments(command) {
  return command.split(/(?:\|\||&&|;|\||\n)/)
}

// Comparar el nombre del ejecutable, también con rutas entre comillas y
// extensiones de Windows. No se ejecuta ni se reescribe el comando original.
function normalizeExecutables(command) {
  let expectsExecutable = true
  return command.replace(/"[^"\r\n]*"|'[^'\r\n]*'|&&|\|\||[;&|\r\n]|[^\s;&|]+/g, (token) => {
    if (/^(?:&&|\|\||[;|\r\n])$/.test(token)) {
      expectsExecutable = true
      return token
    }
    // & invoca una ruta en PowerShell; los argumentos (incluido -m) se conservan.
    if (token === '&') { expectsExecutable = true; return token }
    if (!expectsExecutable) return token
    if (/^(?:call|command|exec)$/i.test(token) || /^[A-Za-z_][\w]*=/.test(token)) return token
    expectsExecutable = false
    const unquoted = token.replace(/^["']|["']$/g, '')
    const name = unquoted.split(/[\\/]/).at(-1)
    const executable = /^(npm|pnpm|yarn|bun|firebase|git)(?:\.(?:cmd|exe|bat))?$/i.exec(name)
    return executable ? executable[1].toLowerCase() : token
  })
}

function pushesToMain(command) {
  if (!/\bgit\b/.test(command) || !/\bpush\b/.test(command)) return false
  return segments(command).some((segment) => {
    if (!/\bgit\b/.test(segment) || !/\bpush\b/.test(segment)) return false
    return segment.split(/\s+/).some((token) => {
      const clean = token.replace(/^["']|["']$/g, '')
      return clean === 'main' || clean.endsWith(':main') || /(?:^|[:/])heads\/main$/.test(clean)
    })
  })
}

function evaluateCommitCommand(command) {
  if (!/\bgit\b/.test(command) || !/\bcommit\b/.test(command)) return null
  if (/\b(?:--amend|--no-verify|--allow-empty)\b/.test(command)) return null
  const flag = /(?:^|\s)(--message(?:=(.*))?|-[a-zA-Z]*m[a-zA-Z]*)(?:\s+("([^"]*)"|'([^']*)'|(\S+))?)/g
  const matches = [...command.matchAll(flag)]
  if (matches.length === 0) return null // editor o archivo -F: lo valida COMMIT_EDITMSG
  let message = matches[0][2] ?? matches[0][4] ?? matches[0][5] ?? matches[0][6] ?? ''
  message = message.replace(/\\(["'\\])/g, '$1')
  if (GIT_GENERATED.test(message)) return null
  return COMMIT_CONVENTION.test(message) ? null : COMMIT_FORMAT_REASON
}

function scanSecrets(text) {
  if (!text) return null
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)) return 'clave privada'
  if (/\bAKIA[0-9A-Z]{16}\b/.test(text)) return 'clave AWS'
  if (/\bghp_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/.test(text)) return 'token de GitHub'
  if (/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(text)) return 'JWT firmado'
  const kv = /\b([A-Z_]*(?:DATABASE_URL|DIRECT_URL)|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|RENDER_DEPLOY_HOOK_URL|FIREBASE_SERVICE_ACCOUNT[A-Z_]*|GITHUB_TOKEN)\s*[=:]\s*["']?([^\s"']{8,})/g
  for (const match of text.matchAll(kv)) {
    const value = match[2].replace(/^["']|["']$/g, '')
    if (BENIGN_VALUE.test(value) || BENIGN_URL.test(value)) continue
    if (/^[A-Za-z_$][\w.$()]*;$/.test(value)) continue // asignación de variable en código
    return `valor aparentemente real de ${match[1]}`
  }
  return null
}

export function evaluateOperation(tool, args = {}) {
  const input = typeof args === 'string' ? { command: args } : (args ?? {})
  const command = String(input.command ?? input.cmd ?? input.patchText ?? input.patch ?? '')
  if (/^(?:Bash|bash|shell|exec_command)$/.test(tool)) {
    const normalized = normalizeExecutables(command)
    if (/\b(?:npm|pnpm|yarn|bun)(?:\s+--?[\w=-]+(?:\s+(?!install\b|update\b|add\b|ci\b)(?:"[^"\r\n]*"|'[^'\r\n]*'|[\w./\\:-]+))?)*\s+(?:i|install|add|remove|uninstall|update|upgrade|dedupe)\b/i.test(normalized)) {
      return { denied: true, reason: 'Stack congelado: restaurar con npm ci; no cambiar dependencias.' }
    }
    if (pushesToMain(normalized)) return { denied: true, reason: MAIN_PUSH_REASON }
    const commitIssue = evaluateCommitCommand(normalized)
    if (commitIssue) return { denied: true, reason: commitIssue }
    const leak = scanSecrets(command)
    if (leak) return { denied: true, reason: SECRET_REASON(leak) }
    return { release: /\bgit\s+(?:-[cC]\s+(?:"[^"\r\n]*"|'[^'\r\n]*'|\S+)\s+)*push\b|\bfirebase\s+(?:--[\w-]+(?:=\S+|\s+\S+)?\s+)*deploy\b/.test(normalized) }
  }
  if (/^(?:apply_patch|patch|Edit|Write|edit|write)$/.test(tool)) {
    const isPatch = tool === 'apply_patch' || tool === 'patch'
    const paths = isPatch
      ? [...command.matchAll(/^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/gm)].map((match) => match[1].trim())
      : [String(input.filePath ?? input.file_path ?? input.path ?? '')]
    if (paths.some((path) => frozenFile.test(`/${path}`) || secretFile.test(`/${path}`))) {
      return { denied: true, reason: 'Archivo protegido: dependencias congeladas y secretos fuera de las ediciones del agente.' }
    }
    const blocked = paths.find((path) => path && (sensitiveFile.test(`/${path}`) || credentialFile.test(`/${path}`)))
    if (blocked) return { denied: true, reason: FILE_REASON(blocked) }
    const content = isPatch
      ? command
      : [input.fileText, input.content, input.text, input.newString, input.oldString, JSON.stringify(input.edits ?? '')].filter(Boolean).join('\n')
    const leak = paths.some((path) => path && !secretScanExempt.test(`/${path}`)) ? scanSecrets(content) : null
    if (leak) return { denied: true, reason: SECRET_REASON(leak) }
  }
  return {}
}

export function evaluateStagedFiles(files) {
  for (const file of files) {
    const path = String(file.path ?? '')
    if (!path) continue
    if (frozenFile.test(`/${path}`) || secretFile.test(`/${path}`)) {
      return { denied: true, reason: 'Archivo protegido: dependencias congeladas y secretos fuera de los commits.' }
    }
    if (sensitiveFile.test(`/${path}`) || credentialFile.test(`/${path}`)) {
      return { denied: true, reason: FILE_REASON(path) }
    }
    if (Number(file.size ?? 0) > heavyLimit) {
      return { denied: true, reason: FILE_REASON(`${path} (${file.size} bytes > 1 MB)`) }
    }
    if (!secretScanExempt.test(`/${path}`)) {
      const leak = scanSecrets(String(file.content ?? ''))
      if (leak) return { denied: true, reason: SECRET_REASON(leak) }
    }
  }
  return {}
}

export function verifyCommitMessage(message) {
  const first = String(message ?? '').split(/\r?\n/)[0].trim()
  if (!first || !GIT_GENERATED.test(first) && !COMMIT_CONVENTION.test(first)) {
    return { denied: true, reason: COMMIT_FORMAT_REASON }
  }
  return {}
}

export function dependencySnapshot(root = projectRoot, dir = 'frontend') {
  const base = resolve(root, dir)
  const manifest = JSON.parse(readFileSync(resolve(base, 'package.json'), 'utf8'))
  const selected = {}
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'engines']) {
    if (manifest[key]) selected[key] = Object.fromEntries(Object.entries(manifest[key]).sort(([a], [b]) => a.localeCompare(b)))
  }
  return {
    manifest: selected,
    lockSha256: createHash('sha256').update(readFileSync(resolve(base, 'package-lock.json'), 'utf8').replace(/\r\n/g, '\n')).digest('hex'),
  }
}

const baselines = [
  ['frontend', '.codex/dependency-baseline.json', 'commit 75d2fff (frontmedias)'],
  ['backend', '.codex/dependency-baseline-backend.json', 'estado auditado del backend'],
]

export function verifyDependencies(root = projectRoot) {
  for (const [dir, file, origin] of baselines) {
    const baseline = JSON.parse(readFileSync(resolve(root, file), 'utf8'))
    if (JSON.stringify(dependencySnapshot(root, dir)) !== JSON.stringify(baseline)) {
      throw new Error(`Dependencias o lockfile de ${dir} modificados respecto al ${origin}. Restaurar el stack original antes de publicar.`)
    }
  }
}

export function verifyRelease(root = projectRoot, run = spawnSync) {
  verifyDependencies(root)
  const tasks = [
    ['frontend', 'typecheck'], ['frontend', 'lint'], ['frontend', 'test'], ['frontend', 'build'],
    ['backend', 'check'], ['backend', 'test:unit'],
  ]
  for (const [prefix, task] of tasks) {
    // Comando fijo: shell en Windows resuelve npm.cmd sin entradas del tool.
    const result = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--prefix', prefix, 'run', task], {
      cwd: root, encoding: 'utf8', shell: process.platform === 'win32', timeout: 120000,
    })
    if (result.error || result.status !== 0) {
      throw new Error(`Verificación ${prefix} ${task} falló: ${(result.stderr || result.stdout || result.error?.message || 'sin salida').slice(-5000)}`)
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
