export const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || '/api';

async function request(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };

  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText || 'Request failed');
    (err as any).status = res.status;
    throw err;
  }
  return data;
}

// Auth
export async function login(email: string, password: string) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) localStorage.setItem('token', data.token);
  return data;
}

export async function me() {
  return request('/auth/me');
}

// Devices
export async function getDevices(query?: { search?: string; type?: string; location?: string; status?: string; from?: string; to?: string; sort?: string; dir?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (query?.search) params.append('search', query.search);
  if (query?.type) params.append('type', query.type);
  if (query?.location) params.append('location', query.location);
  if (query?.status) params.append('status', query.status);
  if (query?.from) params.append('from', query.from);
  if (query?.to) params.append('to', query.to);
  if (query?.sort) params.append('sort', query.sort);
  if (query?.dir) params.append('dir', query.dir);
  if (query?.page) params.append('page', query.page.toString());
  if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
  const queryString = params.toString();
  return request(`/devices${queryString ? `?${queryString}` : ''}`);
}

export async function getDevice(id: string) {
  return request(`/devices/${id}`);
}

export async function createDevice(payload: any) {
  return request('/devices', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateDevice(id: string, payload: any) {
  return request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteDevice(id: string) {
  return request(`/devices/${id}`, { method: 'DELETE' });
}

export async function pingIp(ip: string) {
  const q = new URLSearchParams({ ip });
  return request(`/devices/ping/ip?${q.toString()}`);
}

export async function getStatusSummary(ids?: string[]) {
  const qs = new URLSearchParams();
  if (ids && ids.length) qs.append('ids', ids.join(','));
  const s = qs.toString();
  return request(`/devices/summary${s ? `?${s}` : ''}`);
}

// Users
export async function getUsers() {
  return request('/users');
}

export async function createUser(data: { email: string; password: string; role: string; locations: string[] }) {
  return request('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id: string, data: { email?: string; role?: string; locations?: string[]; status?: string }) {
  return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteUser(id: string) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

export async function changePassword(id: string, newPassword: string) {
  return request(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) });
}

export function logout() {
  const token = localStorage.getItem('token');
  // best-effort notify server
  if (token) {
    fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => {});
  }
  localStorage.removeItem('token');
}

// Settings
export async function getSettings() {
  return request('/users/settings');
}

export async function updateSettings(settings: any) {
  return request('/users/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

// Data import/export
export async function importDevicesCsv(csv: string) {
  return request('/devices/import', { method: 'POST', body: JSON.stringify({ csv }) });
}

export async function exportUsersCsvBlob() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/users/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
  });
  const blob = await res.blob();
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = await blob.text(); } catch {}
    throw new Error(msg || 'Failed to export users');
  }
  const cd = res.headers.get('Content-Disposition') || '';
  let filename = 'users_export.csv';
  const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  if (m) filename = decodeURIComponent((m[1] || m[2] || '').trim());
  return { blob, filename };
}

export async function importUsersCsv(csv: string) {
  return request('/users/import', { method: 'POST', body: JSON.stringify({ csv }) });
}


//
// Global search
export async function globalSearch(q: string) {
  const params = new URLSearchParams({ q });
  return request(`/search?${params.toString()}`);
}

// Reports
export async function listReports() {
  return request('/reports');
}

export async function fetchReportBlob(reportId: string, params?: { from?: string; to?: string; format?: 'csv' | 'json' }) {
  const qs = new URLSearchParams();
  if (reportId) qs.append('reportId', reportId);
  if (params?.from) qs.append('from', params.from);
  if (params?.to) qs.append('to', params.to);
  if (params?.format) qs.append('format', params.format);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/reports/export?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
  });
  const blob = await res.blob();
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = await blob.text(); } catch {}
    throw new Error(msg || 'Failed to export report');
  }
  const cd = res.headers.get('Content-Disposition') || '';
  let filename = 'report';
  const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  if (m) filename = decodeURIComponent((m[1] || m[2] || '').trim());
  const mime = res.headers.get('Content-Type') || blob.type || 'application/octet-stream';
  return { blob, filename, mime };
}

export async function downloadReport(reportId: string, params?: { from?: string; to?: string; format?: 'csv' | 'json' }) {
  const { blob, filename } = await fetchReportBlob(reportId, params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${reportId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


// Health
export async function health() {
  try { return await request('/health'); } catch (e) { return { ok: false, error: String(e) }; }
}
