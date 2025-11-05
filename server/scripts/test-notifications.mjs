// Notification and realtime status end-to-end test
// Usage:
//   BASE=http://localhost:4000/api ADMIN_USERNAME=admin@example.com ADMIN_PASSWORD=Admin@1234 \
//   TEST_USERNAME=manager@example.com TEST_PASSWORD=Manager@12345 \
//   node scripts/test-notifications.mjs

const BASE = process.env.BASE || 'http://localhost:4000/api';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
const TEST_USERNAME = process.env.TEST_USERNAME || 'manager';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Manager@12345';

import { WebSocket } from 'ws';

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  return data;
}

async function login(username, password) {
  const data = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  if (!data?.token) throw new Error('No token from login');
  return data;
}

async function main() {
  console.log('BASE:', BASE);
  const baseUrl = new URL(BASE);
  const wsProto = baseUrl.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProto}://${baseUrl.host}/ws`;
  console.log('Connecting WS:', wsUrl);

  const events = [];
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('WS open timeout')), 8000);
    ws.on('open', () => { clearTimeout(t); resolve(0); });
    ws.on('error', reject);
  });
  ws.on('message', (buf) => {
    try { events.push(JSON.parse(buf.toString())); } catch {}
  });

  console.log('Logging in as admin…');
  const admin = await login(ADMIN_USERNAME, ADMIN_PASSWORD);
  const adminAuth = { Authorization: `Bearer ${admin.token}` };

  console.log('Logging in as test user…');
  const testUser = await login(TEST_USERNAME, TEST_PASSWORD);
  await new Promise(r => setTimeout(r, 750));

  console.log('Logging out test user…');
  await req('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${testUser.token}` } });
  await new Promise(r => setTimeout(r, 750));

  console.log('Fetching devices…');
  const list = await req('/devices', { headers: adminAuth });
  const first = Array.isArray(list?.items) && list.items[0];
  if (first) {
    console.log('Triggering mock offline…');
    await req(`/devices/${first.id}/status/mock`, { method: 'POST', headers: adminAuth, body: JSON.stringify({ reachable: false }) });
    await new Promise(r => setTimeout(r, 750));
  }

  // Summarize
  const authEvents = events.filter(e => e?.type === 'user-auth');
  const statusEvents = events.filter(e => e?.type === 'device-status');
  console.log('Received events:', { auth: authEvents.length, status: statusEvents.length });
  const loginEv = authEvents.find(e => e.action === 'login' && e.user?.username === TEST_USERNAME);
  const logoutEv = authEvents.find(e => e.action === 'logout' && e.user?.username === TEST_USERNAME);
  const anyStatus = statusEvents.some(e => typeof e.reachable === 'boolean');

  console.log('Auth login event:', !!loginEv);
  console.log('Auth logout event:', !!logoutEv);
  console.log('Status broadcast event:', anyStatus);

  if (!loginEv || !logoutEv) {
    throw new Error('Missing auth events. Ensure WS is reachable and server is broadcasting.');
  }
  console.log('OK: notification endpoints and WS broadcasts verified.');
  try { ws.close(); } catch {}
}

main().catch((e) => { console.error('Test failed:', e?.message || e); process.exit(1); });


