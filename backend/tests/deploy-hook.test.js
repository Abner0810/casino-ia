import test from 'node:test';
import assert from 'node:assert/strict';
import { deployWithHook } from '../scripts/deploy-hook.mjs';

const env = {
  RENDER_DEPLOY_HOOK_URL: 'https://api.render.com/deploy/srv-test?key=secret-test',
  RENDER_SERVICE_URL: 'https://casino-ia-9llp.onrender.com',
  DEPLOY_COMMIT_SHA: 'a'.repeat(40),
};

test('hook pins SHA and waits past healthy old instance for the validated commit', async () => {
  let calls = 0;
  const logs = [];
  const result = await deployWithHook(env, {
    log: line => logs.push(line),
    wait: async () => {},
    fetchImpl: async (url, options) => {
      calls++;
      if (calls === 1) {
        assert.equal(new URL(url).searchParams.get('ref'), env.DEPLOY_COMMIT_SHA);
        assert.equal(options.method, 'POST');
        return Response.json({ deploy: { id: 'dep-test' } });
      }
      return Response.json({ status: 'ok', db: 'up', commit: calls === 2 ? 'b'.repeat(40) : env.DEPLOY_COMMIT_SHA });
    },
  });
  assert.equal(result.commit, env.DEPLOY_COMMIT_SHA);
  assert.equal(calls, 3);
  assert.match(logs[0], /accepted for srv-test \(deploy dep-test\)/);
  assert.ok(logs.some(line => line.includes('different or missing commit')));
});

test('readiness logs distinguish HTTP, timeout and network failures without leaking provider data', async () => {
  const logs = [];
  let calls = 0;
  let time = 0;
  await assert.rejects(deployWithHook(env, {
    log: line => logs.push(line),
    now: () => time,
    timeoutMs: 3,
    wait: async () => { time++; },
    fetchImpl: async () => {
      calls++;
      if (calls === 1) return Response.json({ deploy: { id: env.RENDER_DEPLOY_HOOK_URL }, error: 'secret-test' });
      if (calls === 2) return new Response(env.RENDER_DEPLOY_HOOK_URL, { status: 503 });
      if (calls === 3) throw new DOMException(env.RENDER_DEPLOY_HOOK_URL, 'TimeoutError');
      throw new Error(env.RENDER_DEPLOY_HOOK_URL);
    },
  }), /health network request failed/);
  const output = logs.join('\n');
  assert.match(output, /HTTP 503/);
  assert.match(output, /request timed out/);
  assert.match(output, /network request failed/);
  assert.ok(!output.includes('secret-test'));
  assert.ok(!output.includes('https://api.render.com'));
});

test('untrusted health values cannot inject log content or satisfy readiness', async () => {
  const logs = [];
  let time = 0;
  let calls = 0;
  await assert.rejects(deployWithHook(env, {
    log: line => logs.push(line),
    now: () => time,
    timeoutMs: 1,
    wait: async () => { time++; },
    fetchImpl: async () => {
      if (++calls === 1) return Response.json({});
      return Response.json({ status: env.RENDER_DEPLOY_HOOK_URL, db: 'up', commit: env.DEPLOY_COMMIT_SHA });
    },
  }), /backend or database not ready/);
  assert.ok(!logs.join('\n').includes('secret-test'));
});

test('hook failures redact provider errors containing the secret URL', async () => {
  await assert.rejects(deployWithHook(env, {
    fetchImpl: async () => { throw new Error(env.RENDER_DEPLOY_HOOK_URL); },
  }), { message: 'Render deploy hook request failed.' });
});

test('healthy old commit times out instead of reporting deploy success', async () => {
  let time = 0;
  await assert.rejects(deployWithHook(env, {
    now: () => time,
    timeoutMs: 1,
    wait: async () => { time++; },
    fetchImpl: async () => Response.json({ status: 'ok', db: 'up', commit: 'b'.repeat(40) }),
  }), /Timed out/);
});
