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
  const result = await deployWithHook(env, {
    wait: async () => {},
    fetchImpl: async (url, options) => {
      calls++;
      if (calls === 1) {
        assert.equal(new URL(url).searchParams.get('ref'), env.DEPLOY_COMMIT_SHA);
        assert.equal(options.method, 'POST');
        return Response.json({});
      }
      return Response.json({ status: 'ok', db: 'up', commit: calls === 2 ? 'b'.repeat(40) : env.DEPLOY_COMMIT_SHA });
    },
  });
  assert.equal(result.commit, env.DEPLOY_COMMIT_SHA);
  assert.equal(calls, 3);
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
