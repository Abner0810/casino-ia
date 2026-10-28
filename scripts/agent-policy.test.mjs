import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { evaluateOperation, evaluateStagedFiles, verifyCommitMessage, dependencySnapshot, verifyDependencies, verifyRelease, projectRoot } from './agent-policy.mjs'
import { CasinoGuardia } from '../.opencode/plugins/casino-guardia.js'

test('permite npm ci y bloquea mutaciones de dependencias incluso con prefijo', () => {
  for (const command of ['npm ci', 'npm --prefix frontend ci', 'npm run build', 'git status']) {
    assert.ok(!evaluateOperation('Bash', { command }).denied, command)
  }
  for (const command of ['npm install', 'npm --prefix frontend install react', 'npm update', 'pnpm add react', 'bun install', 'yarn upgrade']) {
    assert.equal(evaluateOperation('Bash', { command }).denied, true, command)
  }
})

test('aplica los controles a ejecutables Windows y rutas entre comillas', () => {
  for (const command of [
    'npm.cmd install react', 'npm.cmd --prefix frontend install react',
    'npm.cmd --prefix "frontend folder" install react', 'pnpm.cmd add react',
    'yarn.cmd upgrade', 'bun.exe install',
    '& "C:\\Program Files\\nodejs\\npm.cmd" install react',
    "& 'C:\\Program Files\\nodejs\\npm.cmd' update", './npm.cmd uninstall react',
  ]) {
    assert.equal(evaluateOperation('exec_command', { cmd: command }).denied, true, command)
  }
  for (const command of ['npm.cmd ci', 'npm.cmd --prefix "frontend folder" ci',
    '& "C:\\Program Files\\nodejs\\npm.cmd" run build', 'firebase.cmd projects:list']) {
    const result = evaluateOperation('exec_command', { cmd: command })
    assert.ok(!result.denied && !result.release, command)
  }
  for (const command of ['firebase.cmd deploy --only hosting', 'firebase.cmd --project casino-ia deploy',
    '& "C:\\Users\\Test User\\firebase.cmd" deploy --only hosting',
    "& 'C:\\Users\\Test User\\firebase.cmd' deploy --only hosting",
    'git.exe push origin dev', '"C:\\Program Files\\Git\\cmd\\git.exe" -C "frontend folder" push origin dev']) {
    assert.equal(evaluateOperation('exec_command', { cmd: command }).release, true, command)
  }
  assert.equal(evaluateOperation('exec_command', { cmd: 'git.exe push origin HEAD:main' }).denied, true)
  for (const command of ['git commit -m "fix(hooks): document /npm"',
    'git.exe commit -m "fix(hooks): document /npm"',
    'git commit -m "docs: describe C:\\Program Files\\npm.cmd"']) {
    assert.ok(!evaluateOperation('exec_command', { cmd: command }).denied, command)
  }
  assert.equal(evaluateOperation('exec_command', { cmd: 'cd frontend; npm.cmd install react' }).denied, true)
  assert.equal(evaluateOperation('exec_command', { cmd: 'call "C:\\Program Files\\nodejs\\npm.cmd" install react' }).denied, true)
})

test('protege manifests/secretos y permite .env.example y código', () => {
  assert.equal(evaluateOperation('write', { filePath: 'frontend/package.json' }).denied, true)
  assert.equal(evaluateOperation('edit', { filePath: 'frontend/.env.local' }).denied, true)
  assert.ok(!evaluateOperation('write', { filePath: 'frontend/.env.example' }).denied)
  assert.ok(!evaluateOperation('write', { filePath: 'frontend/src/App.tsx' }).denied)
  assert.equal(evaluateOperation('apply_patch', { command: '*** Begin Patch\n*** Update File: frontend/package-lock.json\n*** End Patch' }).denied, true)
  assert.equal(evaluateOperation('apply_patch', { patchText: '*** Begin Patch\n*** Add File: frontend/.env.production\n*** End Patch' }).denied, true)
  assert.equal(evaluateOperation('apply_patch', { command: '*** Begin Patch\n*** Update File: frontend/temp.txt\n*** Move to: frontend/package-lock.json\n*** End Patch' }).denied, true)
})

test('bloquea push a main en todas sus formas y permite el resto del flujo', () => {
  const blocked = ['git push origin main', 'git push -u origin main', 'git push origin HEAD:main', 'git push origin dev:main', 'git -C frontend push origin main', 'git push https://github.com/x/y.git main', 'git push origin refs/heads/main']
  for (const command of blocked) {
    assert.equal(evaluateOperation('Bash', { command }).denied, true, command)
    assert.match(evaluateOperation('Bash', { command }).reason, /pushear a main/)
  }
  for (const command of ['git push origin dev', 'git push origin qa', 'git -C frontend push origin feat/x', 'git push --set-upstream origin ci/ramas', 'git checkout main', 'git log main..dev', 'git push origin main-backup']) {
    assert.ok(!evaluateOperation('Bash', { command }).denied, command)
  }
})

test('identifica publicación sin bloquear lecturas de git/firebase', () => {
  for (const command of ['git push origin dev', 'git -C frontend push origin qa', 'firebase deploy --only hosting', 'firebase --project casino-ia deploy']) {
    assert.equal(evaluateOperation('Bash', { command }).release, true, command)
  }
  assert.ok(!evaluateOperation('Bash', { command: 'firebase projects:list' }).release)
})

test('exige convención de commits en comandos git', () => {
  const valid = ['git commit -m "feat(wallet): añade retiro simulado"', 'git commit -am "fix(auth): corrige refresh"', 'git commit -m "docs: actualiza agentes"', 'git commit -m "feat: cambio mínimo"', 'git commit', 'git commit --amend --no-edit', 'git commit --no-verify -m "chore: temporal"', 'git commit -m "Merge branch dev into feat/x"', 'git commit -m "Revert \\"feat: x\\""']
  for (const command of valid) {
    assert.ok(!evaluateOperation('Bash', { command }).denied, command)
  }
  for (const command of ['git commit -m "cambios"', 'git commit -m "wip"', 'git commit -m ""']) {
    assert.equal(evaluateOperation('Bash', { command }).denied, true, command)
    assert.match(evaluateOperation('Bash', { command }).reason, /Formato de commit/)
  }
})

test('bloquea archivos sensibles y secretos por contenido en ediciones', () => {
  for (const filePath of ['node_modules/x/index.js', 'frontend/dist/app.js', 'backend/coverage/lcov.info', 'backend/credentials.json', 'server.pem', 'dump.sqlite', 'backup.zip', 'logs/app.log']) {
    assert.equal(evaluateOperation('write', { filePath, content: 'algo' }).denied, true, filePath)
  }
  assert.ok(!evaluateOperation('write', { filePath: 'docs/agentes.md', content: 'sin secretos' }).denied)
  assert.equal(evaluateOperation('write', { filePath: 'docs/notas.md', content: 'JWT_ACCESS_SECRET=valor-real-super-secreto-32-chars' }).denied, true)
  assert.equal(evaluateOperation('write', { filePath: 'docs/notas.md', content: 'DATABASE_URL=postgresql://user:clave-secreta-123@host:5432/db' }).denied, true)
  assert.equal(evaluateOperation('write', { filePath: 'docs/notas.md', content: '-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----' }).denied, true)
  assert.equal(evaluateOperation('write', { filePath: 'docs/notas.md', content: 'token ghp_abcdefghijklmnopqrstuvwx1234567890abcd' }).denied, true)
  assert.equal(evaluateOperation('write', { filePath: 'docs/notas.md', content: 'AWS AKIA1234567890ABCDEF' }).denied, true)
  assert.ok(!evaluateOperation('write', { filePath: 'docs/notas.md', content: 'JWT_ACCESS_SECRET=<tu-secreto-min-32>' }).denied)
  assert.ok(!evaluateOperation('write', { filePath: 'docs/notas.md', content: 'DATABASE_URL=postgresql://casino_test:casino_test@localhost:5432/casino_test' }).denied)
  // Los archivos de prueba quedan exentos del escáner de contenido.
  assert.ok(!evaluateOperation('write', { filePath: 'scripts/agent-policy.test.mjs', content: 'JWT_ACCESS_SECRET=valor-real-de-prueba-123456' }).denied)
})

test('reglas de pre-commit protegen índice y mensaje de commit', () => {
  assert.equal(evaluateStagedFiles([{ path: '.env', size: 10, content: '' }]).denied, true)
  assert.equal(evaluateStagedFiles([{ path: 'backend/credentials.json', size: 10, content: '{}' }]).denied, true)
  assert.equal(evaluateStagedFiles([{ path: 'docs/x.md', size: 2_000_000, content: '' }]).denied, true)
  assert.equal(evaluateStagedFiles([{ path: 'docs/x.md', size: 10, content: 'RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-abc123?key=clave-real-456' }]).denied, true)
  assert.deepEqual(evaluateStagedFiles([{ path: 'docs/x.md', size: 10, content: 'sin secretos' }]), {})
  assert.deepEqual(evaluateStagedFiles([{ path: '.github/workflows/ci.yml', size: 10, content: 'DATABASE_URL: postgresql://casino_test:casino_test@localhost:5432/casino_test\nJWT_ACCESS_SECRET: ci-access-secret-de-pruebas-1234567890-abcdef' }]), {})
  assert.deepEqual(evaluateStagedFiles([{ path: 'backend/tests/e2e.mjs', size: 10, content: 'JWT_ACCESS_SECRET=valor-real-de-prueba-123456' }]), {})
  assert.deepEqual(verifyCommitMessage('feat(x): añade y'), {})
  assert.deepEqual(verifyCommitMessage('Merge branch dev into feat/x\n\nConflicts:\n\tx'), {})
  assert.equal(verifyCommitMessage('cambios').denied, true)
  assert.equal(verifyCommitMessage('').denied, true)
  assert.equal(verifyCommitMessage('wip sin tipo\nfeat: válido pero no es el primero').denied, true)
})

test('integridad detecta deriva y normaliza CRLF entre Windows y CI Linux', () => {
  const root = mkdtempSync(join(tmpdir(), 'casino-policy-'))
  try {
    mkdirSync(join(root, 'frontend')); mkdirSync(join(root, 'backend')); mkdirSync(join(root, '.codex'))
    const manifest = { dependencies: { react: '^19.3.1' }, scripts: { build: 'vite build' } }
    writeFileSync(join(root, 'frontend/package.json'), JSON.stringify(manifest))
    writeFileSync(join(root, 'frontend/package-lock.json'), '{\r\n  "lockfileVersion": 3\r\n}\r\n')
    writeFileSync(join(root, 'backend/package.json'), JSON.stringify({ dependencies: { express: '^5.1.0' }, engines: { node: '>=22' } }))
    writeFileSync(join(root, 'backend/package-lock.json'), '{\n  "lockfileVersion": 3\n}\n')
    writeFileSync(join(root, '.codex/dependency-baseline.json'), JSON.stringify(dependencySnapshot(root, 'frontend')))
    writeFileSync(join(root, '.codex/dependency-baseline-backend.json'), JSON.stringify(dependencySnapshot(root, 'backend')))
    writeFileSync(join(root, 'frontend/package-lock.json'), '{\n  "lockfileVersion": 3\n}\n')
    verifyDependencies(root)
    const called = []
    verifyRelease(root, (_cmd, args) => { called.push(`${args[1]}:${args.at(-1)}`); return { status: 0 } })
    assert.deepEqual(called, ['frontend:typecheck', 'frontend:lint', 'frontend:test', 'frontend:build', 'backend:check', 'backend:test:unit'])
    assert.throws(() => verifyRelease(root, () => ({ status: 1, stderr: 'fallo comprobado' })), /typecheck.*fallo comprobado/)
    manifest.dependencies.react = '^20.0.0'
    writeFileSync(join(root, 'frontend/package.json'), JSON.stringify(manifest))
    assert.throws(() => verifyDependencies(root), /frontend.*modificados/)
    writeFileSync(join(root, 'frontend/package.json'), JSON.stringify(manifest).replace('^20.0.0', '^19.3.1'))
    writeFileSync(join(root, 'backend/package.json'), JSON.stringify({ dependencies: { express: '^6.0.0' }, engines: { node: '>=22' } }))
    assert.throws(() => verifyDependencies(root), /backend.*modificados/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('hook Codex real produce contexto y bloquea llamada protegida por exit 2', () => {
  const hook = join(projectRoot, '.codex/hooks/guard.mjs')
  const start = spawnSync(process.execPath, [hook], { cwd: projectRoot, input: JSON.stringify({ hook_event_name: 'SessionStart' }), encoding: 'utf8' })
  assert.equal(start.status, 0, start.stderr)
  assert.equal(JSON.parse(start.stdout).hookSpecificOutput.hookEventName, 'SessionStart')
  const blocked = spawnSync(process.execPath, [hook], { cwd: projectRoot, input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm install react' } }), encoding: 'utf8' })
  assert.equal(blocked.status, 2)
  assert.match(blocked.stderr, /Stack congelado/)
  const native = spawnSync(process.execPath, [hook], { cwd: projectRoot, input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'npm install react' } }), encoding: 'utf8' })
  assert.equal(native.status, 2)
  assert.match(native.stderr, /Stack congelado/)
  const windows = spawnSync(process.execPath, [hook], { cwd: projectRoot, input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'exec_command', tool_input: { cmd: 'npm.cmd install react' } }), encoding: 'utf8' })
  assert.equal(windows.status, 2)
  assert.match(windows.stderr, /Stack congelado/)
  const mainPush = spawnSync(process.execPath, [hook], { cwd: projectRoot, input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git push origin main' } }), encoding: 'utf8' })
  assert.equal(mainPush.status, 2)
  assert.match(mainPush.stderr, /pushear a main/)
  const hooks = JSON.parse(readFileSync(join(projectRoot, '.codex/hooks.json'), 'utf8'))
  const matcher = new RegExp(hooks.hooks.PreToolUse[0].matcher)
  assert.ok(matcher.test('Bash'))
  assert.ok(matcher.test('exec_command'))
})

test('plugin OpenCode registra hook funcional sin paquetes externos', async () => {
  const plugin = await CasinoGuardia()
  await assert.rejects(plugin['tool.execute.before']({ tool: 'bash' }, { args: { command: 'npm install react' } }), /Stack congelado/)
  await assert.rejects(plugin['tool.execute.before']({ tool: 'bash' }, { args: { command: 'npm.cmd install react' } }), /Stack congelado/)
  await assert.rejects(plugin['tool.execute.before']({ tool: 'bash' }, { args: { command: 'git push origin main' } }), /pushear a main/)
  await assert.rejects(plugin['tool.execute.before']({ tool: 'write' }, { args: { path: 'docs/x.md', content: 'JWT_ACCESS_SECRET=valor-real-super-secreto-32' } }), /Posible/)
  await plugin['tool.execute.before']({ tool: 'bash' }, { args: { command: 'git status' } })
  const config = JSON.parse(readFileSync(join(projectRoot, 'opencode.jsonc'), 'utf8'))
  assert.ok(config.permission || config.permissions)
})
