// Simple smoke tests for the API
// Usage: BACKEND_URL=http://localhost:4000 npm run smoke

const BASE = process.env.BACKEND_URL || 'http://localhost:4000';

async function get(path) {
  const res = await fetch(BASE + path);
  return { status: res.status, text: await res.text(), headers: res.headers };
}

(async () => {
  try {
    const root = await get('/');
    if (root.status !== 200) throw new Error(`GET / => ${root.status}`);
    console.log('OK /');

    const health = await get('/health');
    if (health.status !== 200) throw new Error(`GET /health => ${health.status}`);
    try {
      const json = JSON.parse(health.text);
      const healthy = (json && (json.ok === true || json.status === 'ok'));
      if (!healthy) throw new Error('health not ok');
    } catch (e) {
      throw new Error('health invalid JSON');
    }
    console.log('OK /health');

    const metrics = await get('/metrics');
    if (metrics.status !== 200) throw new Error(`GET /metrics => ${metrics.status}`);
    if (!((metrics.headers.get('content-type') || '').includes('text/plain') || metrics.text.includes('http_requests_total'))) {
      console.warn('WARN: /metrics content-type or body not as expected');
    }
    console.log('OK /metrics');

    console.log('Smoke tests passed.');
  } catch (e) {
    console.error('Smoke tests failed:', e.message);
    process.exit(1);
  }
})();

