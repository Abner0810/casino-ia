// Run only after unit/E2E checks against a committed, validated SHA.
const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;
const commitId = process.env.DEPLOY_COMMIT_SHA;
if (!apiKey || !serviceId || !/^[a-f0-9]{40}$/i.test(commitId || '')) {
  throw new Error('RENDER_API_KEY, RENDER_SERVICE_ID and a full DEPLOY_COMMIT_SHA are required.');
}
if (!/^srv-[a-z0-9]+$/.test(serviceId)) throw new Error('Invalid Render service ID.');
const base = `https://api.render.com/v1/services/${serviceId}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function render(path = '', method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  // Provider bodies may contain private service configuration.
  if (!response.ok) throw new Error(`Render ${method} failed (HTTP ${response.status}).`);
  return response.json();
}
const service = await render();
const repo = String(service.repo || '').replace(/\.git$/, '').replace(/\/$/, '');
if (repo !== 'https://github.com/Abner0810/casino-ia' || service.type !== 'web_service') {
  throw new Error('Render service must be the casino-ia web service.');
}
if (service.branch !== 'main') throw new Error('Render service must use the main branch.');
const serviceUrl = service.serviceDetails?.url;
if (!serviceUrl || !serviceUrl.startsWith('https://')) throw new Error('Render service has no HTTPS URL.');
await render('', 'PATCH', { autoDeployTrigger: 'off' });
const deploy = await render('/deploys', 'POST', { commitId, clearCache: 'do_not_clear' });
if (!deploy.id) throw new Error('Render did not return a deploy ID.');
console.log(`Render deploy ${deploy.id} requested for ${commitId}.`);
const deadline = Date.now() + 25 * 60_000;
const failed = new Set(['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated']);
let live = false;
while (Date.now() < deadline) {
  const current = await render(`/deploys/${deploy.id}`);
  console.log(`Render status: ${current.status}`);
  if (failed.has(current.status)) throw new Error(`Render deploy ended: ${current.status}.`);
  if (current.status === 'live') {
    if (current.commit?.id !== commitId) throw new Error('Live deploy does not match the validated commit.');
    live = true;
    break;
  }
  await sleep(10_000);
}
if (!live) throw new Error('Timed out waiting for Render deploy to become live.');
let healthy = false;
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const response = await fetch(new URL('/health', serviceUrl), { signal: AbortSignal.timeout(15_000) });
    const body = await response.json();
    if (response.ok && body.status === 'ok' && body.db === 'up') {
      healthy = true;
      break;
    }
  } catch { /* Retry startup/network failures within a fixed window. */ }
  await sleep(5_000);
}
if (!healthy) throw new Error('The live backend failed /health verification.');
console.log(`Backend healthy: ${serviceUrl} (commit ${commitId}).`);
