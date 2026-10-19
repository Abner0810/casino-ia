import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { evaluateOperation, dependencySnapshot, verifyDependencies, verifyRelease, projectRoot } from './agent-policy.mjs'
import { CasinoGuardia } from '../.opencode/plugins/casino-guardia.js'

test('permite npm ci y bloquea mutaciones de dependencias incluso con prefijo', () => {
  for (const command of ['npm ci', 'npm --prefix frontend ci', 'npm run build', 'git status']) {
    assert.ok(!evaluateOperation('Bash', { command }).denied, command)
  }
  for (const command of ['npm install', 'npm --prefix frontend install react', 'npm update', 'pnpm add react', 'bun install', 'yarn upgrade']) {
    assert.equal(evaluateOperation('Bash', { command }).denied, true, command)
  }
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

test('identifica publicación sin bloquear lecturas de git/firebase', () => {
  for (const command of ['git push origin main', 'git -C frontend push origin dev', 'firebase deploy --only hosting', 'firebase --project casino-ia deploy']) {
    assert.equal(evaluateOperation('Bash', { command }).release, true, command)
  }
  assert.ok(!evaluateOperation('Bash', { command: 'firebase projects:list' }).release)
})

test('integridad detecta deriva y normaliza CRLF entre Windows y CI Linux', () => {
  const root = mkdtempSync(join(tmpdir(), 'casino-policy-'))
  try {
    mkdirSync(join(root, 'frontend')); mkdirSync(join(root, '.codex'))
    const manifest = { dependencies: { react: '^19.3.1' }, scripts: { build: 'vite build' } }
    writeFileSync(join(root, 'frontend/package.json'), JSON.stringify(manifest))
    writeFileSync(join(root, 'frontend/package-lock.json'), '{\r\n  "lockfileVersion": 3\r\n}\r\n')
    writeFileSync(join(root, '.codex/dependency-baseline.json'), JSON.stringify(dependencySnapshot(root)))
    writeFileSync(join(root, 'frontend/package-lock.json'), '{\n  "lockfileVersion": 3\n}\n')
    verifyDependencies(root)
    const called = []
    verifyRelease(root, (_cmd, args) => { called.push(args.at(-1)); return { status: 0 } })
    assert.deepEqual(called, ['typecheck', 'lint', 'test', 'build'])
    assert.throws(() => verifyRelease(root, () => ({ status: 1, stderr: 'fallo comprobado' })), /typecheck.*fallo comprobado/)
    manifest.dependencies.react = '^20.0.0'
    writeFileSync(join(root, 'frontend/package.json'), JSON.stringify(manifest))
    assert.throws(() => verifyDependencies(root), /modificados/)
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
  const hooks = JSON.parse(readFileSync(join(projectRoot, '.codex/hooks.json'), 'utf8'))
  const matcher = new RegExp(hooks.hooks.PreToolUse[0].matcher)
  assert.ok(matcher.test('Bash'))
  assert.ok(matcher.test('exec_command'))
})

test('plugin OpenCode registra hook funcional sin paquetes externos', async () => {
  const plugin = await CasinoGuardia()
  await assert.rejects(plugin['tool.execute.before']({ tool: 'bash' }, { args: { command: 'npm install react' } }), /Stack congelado/)
  await plugin['tool.execute.before']({ tool: 'bash' }, { args: { command: 'git status' } })
  const config = JSON.parse(readFileSync(join(projectRoot, 'opencode.jsonc'), 'utf8'))
  assert.ok(config.permission)
  assert.equal(config.permissions, undefined)
})
