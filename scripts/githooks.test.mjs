import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { dependencySnapshot, projectRoot } from './agent-policy.mjs'

const tasks = ['frontend typecheck', 'frontend lint', 'frontend test', 'frontend build', 'backend check', 'backend test:unit']

function fixture(t) {
  const tempRoot = realpathSync(tmpdir())
  const directory = mkdtempSync(join(tempRoot, 'casino git hooks-'))
  t.after(() => {
    const target = realpathSync(directory)
    const child = relative(tempRoot, target)
    assert.ok(child && child !== '..' && !child.startsWith(`..${sep}`) && resolve(target) !== resolve(tempRoot))
    rmSync(target, { recursive: true, force: true })
  })
  const root = join(directory, 'work')
  mkdirSync(root)
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  const git = (...args) => spawnSync('git', args, { cwd: root, env, encoding: 'utf8', timeout: 30000 })
  const ok = (...args) => {
    const result = git(...args)
    assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}\n${result.stdout}\n${result.error ?? ''}`)
    return result.stdout
  }
  const write = (path, content) => {
    const target = join(root, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  ok('init', '--initial-branch=fixture')
  ok('config', 'user.name', 'Hook fixture')
  ok('config', 'user.email', 'fixture@example.invalid')
  ok('config', 'commit.gpgsign', 'false')
  ok('config', 'core.autocrlf', 'false')
  for (const file of ['.githooks/pre-commit', '.githooks/commit-msg', '.githooks/pre-push', 'scripts/githooks-pre-commit.mjs', 'scripts/githooks-commit-msg.mjs', 'scripts/agent-policy.mjs', 'backend/scripts/check.mjs']) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    copyFileSync(join(projectRoot, file), join(root, file))
    if (file.startsWith('.githooks/')) chmodSync(join(root, file), 0o755)
  }
  ok('config', 'core.hooksPath', '.githooks')
  return { root, directory, env, git, ok, write }
}

function setupRelease(f) {
  for (const area of ['frontend', 'backend']) {
    f.write(`${area}/package.json`, '{}\n')
    f.write(`${area}/package-lock.json`, '{}\n')
    const baseline = area === 'frontend' ? 'dependency-baseline.json' : 'dependency-baseline-backend.json'
    f.write(`.codex/${baseline}`, JSON.stringify(dependencySnapshot(f.root, area)))
  }
  f.write('fixture-bin/npm-fixture.mjs', `import { appendFileSync } from 'node:fs'
const args = process.argv.slice(2)
const task = args[1] + ' ' + args[3]
appendFileSync(process.env.HOOK_FIXTURE_LOG, task + '\\n')
if (task === process.env.HOOK_FIXTURE_FAIL) {
  console.error('Intentional fixture failure: ' + task)
  process.exitCode = 1
}
`)
  f.write('fixture-bin/npm.cmd', `@"${process.execPath}" "%~dp0npm-fixture.mjs" %*\r\n`)
  f.write('fixture-bin/npm', `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' "$(dirname "$0")/npm-fixture.mjs" "$@"\n`)
  chmodSync(join(f.root, 'fixture-bin/npm'), 0o755)
  const pathKey = Object.keys(f.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH'
  f.env[pathKey] = join(f.root, 'fixture-bin') + (process.platform === 'win32' ? ';' : ':') + f.env[pathKey]
  f.env.HOOK_FIXTURE_LOG = join(f.root, '.git', 'npm-calls.log')
  f.write('README.md', 'Fixture\n')
  f.ok('add', 'README.md')
  f.ok('commit', '-m', 'test: fixture inicial')
  const remote = join(f.directory, 'remote.git')
  f.ok('init', '--bare', remote)
  f.ok('remote', 'add', 'origin', remote)
  return remote
}

test('primer commit no necesita COMMIT_EDITMSG previo y commit-msg valida el mensaje actual', (t) => {
  const f = fixture(t)
  assert.equal(existsSync(join(f.root, '.git/COMMIT_EDITMSG')), false)
  f.write('README.md', 'Primero\n')
  f.ok('add', 'README.md')
  f.ok('commit', '-m', 'feat: primer commit')

  f.write('.git/COMMIT_EDITMSG', 'mensaje anterior invalido\n')
  f.write('README.md', 'Segundo\n')
  f.ok('add', 'README.md')
  f.ok('commit', '-m', 'fix: mensaje actual valido')
  const previous = f.ok('rev-parse', 'HEAD')

  f.write('.git/COMMIT_EDITMSG', 'feat: mensaje anterior valido\n')
  f.write('README.md', 'Tercero\n')
  f.ok('add', 'README.md')
  const result = f.git('commit', '-m', 'mensaje invalido')
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Formato de commit/)
  assert.equal(f.ok('rev-parse', 'HEAD'), previous)
})

test('pre-commit escanea el indice, no los cambios sin preparar', (t) => {
  const f = fixture(t)
  f.write('frontend/src/value.ts', 'export const value = 1\n')
  f.ok('add', 'frontend/src/value.ts')
  const secret = ['-----BEGIN ', 'PRIVATE KEY-----'].join('')
  f.write('frontend/src/value.ts', secret)
  f.ok('commit', '-m', 'feat: contenido seguro preparado')
  assert.match(f.ok('show', 'HEAD:frontend/src/value.ts'), /value = 1/)
  f.ok('add', 'frontend/src/value.ts')
  f.write('frontend/src/value.ts', 'export const value = 2\n')
  const blocked = f.git('commit', '-m', 'fix: secreto preparado')
  assert.notEqual(blocked.status, 0)
  assert.match(blocked.stderr, /clave privada/)
})

test('pre-commit conserva la comprobacion de sintaxis backend sobre el indice', (t) => {
  const f = fixture(t)
  f.write('backend/src/example.mjs', 'const = broken\n')
  f.ok('add', 'backend/src/example.mjs')
  f.write('backend/src/example.mjs', 'export const valid = true\n')
  const blocked = f.git('commit', '-m', 'test: sintaxis preparada invalida')
  assert.notEqual(blocked.status, 0)
  assert.match(blocked.stderr, /SyntaxError/)
})

test('pre-push bloquea main leyendo el ref recibido de Git antes del release', (t) => {
  const f = fixture(t)
  setupRelease(f)
  const blocked = f.git('push', 'origin', 'HEAD:refs/heads/main')
  assert.notEqual(blocked.status, 0)
  assert.match(blocked.stderr, /pushear a main/)
  assert.equal(existsSync(f.env.HOOK_FIXTURE_LOG), false)
  assert.equal(f.ok('ls-remote', 'origin').trim(), '')
})

test('pre-push ejecuta el release real y no publica si falla cualquier control', async (t) => {
  for (let index = 0; index < tasks.length; index++) {
    await t.test(tasks[index], (child) => {
      const f = fixture(child)
      setupRelease(f)
      f.env.HOOK_FIXTURE_FAIL = tasks[index]
      const blocked = f.git('push', 'origin', 'HEAD:refs/heads/dev')
      assert.notEqual(blocked.status, 0)
      assert.match(blocked.stderr, /Verificaci[oó]n .* fall[oó]/)
      assert.deepEqual(readFileSync(f.env.HOOK_FIXTURE_LOG, 'utf8').trim().split('\n'), tasks.slice(0, index + 1))
      assert.equal(f.ok('ls-remote', 'origin').trim(), '')
    })
  }
})

test('pre-push publica al remoto local cuando pasan los seis controles una sola vez', (t) => {
  const f = fixture(t)
  setupRelease(f)
  f.ok('push', 'origin', 'HEAD:refs/heads/dev')
  assert.deepEqual(readFileSync(f.env.HOOK_FIXTURE_LOG, 'utf8').trim().split('\n'), tasks)
  assert.match(f.ok('ls-remote', 'origin', 'refs/heads/dev'), /refs\/heads\/dev/)
})
