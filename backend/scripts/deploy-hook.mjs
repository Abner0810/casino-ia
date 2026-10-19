import { pathToFileURL } from 'node:url';

// Never log the deploy hook or provider errors: the URL itself is a credential.
export async function deployWithHook(env = process.env, {
  fetchImpl = fetch,
  wait = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  now = Date.now,
  timeoutMs = 25 * 60_000,
  log = console.log,
} = {}) {
  const commit = env.DEPLOY_COMMIT_SHA;
  if (!/^[a-f0-9]{40}$/i.test(commit || '') || !env.RENDER_DEPLOY_HOOK_URL) {
    throw new Error('RENDER_DEPLOY_HOOK_URL and a full DEPLOY_COMMIT_SHA are required.');
  }
  let hook;
  try { hook = new URL(env.RENDER_DEPLOY_HOOK_URL); }
  catch { throw new Error('Invalid Render deploy hook configuration.'); }
  if (hook.origin !== 'https://api.render.com' || !/^\/deploy\/srv-[a-z0-9]+$/.test(hook.pathname) || !hook.searchParams.has('key')) {
    throw new Error('Invalid Render deploy hook configuration.');
  }
  if (env.RENDER_SERVICE_URL !== 'https://casino-ia-9llp.onrender.com') {
    throw new Error('The configured backend URL must be casino-ia-9llp.onrender.com.');
  }
  hook.searchParams.set('ref', commit);
  let response;
  try { response = await fetchImpl(hook, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000) }); }
  catch { throw new Error('Render deploy hook request failed.'); }
  if (!response.ok) throw new Error(`Render deploy hook failed (HTTP ${response.status}).`);
  let deployId;
  try {
    const result = await response.json();
    const id = result?.deploy?.id ?? result?.id;
    if (typeof id === 'string' && /^dep-[a-z0-9]{1,80}$/.test(id)) deployId = id;
  } catch { /* Hook acceptance does not require a JSON response. */ }
  const serviceId = hook.pathname.slice('/deploy/'.length);
  log(`Render hook accepted for ${serviceId}${deployId ? ` (deploy ${deployId})` : ''}; waiting for commit ${commit}.`);
  const started = now();
  const deadline = started + timeoutMs;
  let lastStatus = 'no health response';
  while (now() < deadline) {
    try {
      const health = await fetchImpl(`${env.RENDER_SERVICE_URL}/health?commit=${commit}`, {
        cache: 'no-store', signal: AbortSignal.timeout(15_000),
      });
      if (!health.ok) {
        lastStatus = `HTTP ${health.status}`;
      } else {
        let body;
        try { body = await health.json(); }
        catch { lastStatus = 'HTTP success with invalid health JSON'; }
        if (body) {
          if (body.status !== 'ok' || body.db !== 'up') lastStatus = 'backend or database not ready';
          else if (body.commit !== commit) lastStatus = 'healthy instance with a different or missing commit';
          else {
            log(`Validated commit is healthy after ${Math.floor((now() - started) / 1000)}s.`);
            return { commit, url: env.RENDER_SERVICE_URL };
          }
        }
      }
    } catch (error) {
      lastStatus = error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'health request timed out' : 'health network request failed';
    }
    log(`Render readiness after ${Math.floor((now() - started) / 1000)}s: ${lastStatus}; retrying.`);
    await wait(10_000);
  }
  throw new Error(`Timed out waiting for the validated commit to become healthy on Render (${lastStatus}). Inspect the Render dashboard build/start logs.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deployWithHook().then(({ commit, url }) => console.log(`Backend healthy: ${url} (commit ${commit}).`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
