// Basic smoke tests for server API
const base = process.env.BASE || `http://localhost:${process.env.PORT || 4000}/api`;
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function req(path, opts={}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers||{}) };
  const res = await fetch(base + path, { ...opts, headers });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  return data;
}

async function main() {
  console.log('Smoke: login…');
  const login = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@example.com', password: 'Admin@1234' }) });
  assert(login?.token, 'no token');
  const auth = { Authorization: `Bearer ${login.token}` };

  console.log('Smoke: /auth/me…');
  const me = await req('/auth/me', { headers: auth });
  assert(me?.email, 'me failed');

  console.log('Smoke: /devices…');
  const list = await req('/devices', { headers: auth });
  assert(Array.isArray(list?.items), 'devices list missing items');
  const first = list.items[0];
  if (first?.id) {
    console.log('Smoke: /devices/:id/status…');
    try { await req(`/devices/${first.id}/status`, { headers: auth }); } catch {}
  }

  console.log('Smoke: /users/settings GET/PUT…');
  const settings = await req('/users/settings', { headers: auth });
  const put = await req('/users/settings', { method: 'PUT', headers: auth, body: JSON.stringify({ ...settings, notifications: { ...(settings.notifications||{}), deviceAlerts: true } }) });
  assert(put, 'settings PUT failed');

  console.log('Smoke: /search?q=RT…');
  await req('/search?q=RT', { headers: auth });

  console.log('OK');
}

main().catch((e) => { console.error('Smoke failed:', e); process.exit(1); });

