// =====================================================
// Backend Client — talks to Express API when available,
// falls back to localStorage otherwise.
// =====================================================
// Set REACT_APP_API_URL (e.g. http://localhost:4000) and
// REACT_APP_ADMIN_KEY in .env to enable backend mode.
// =====================================================

const API = process.env.REACT_APP_API_URL || '';
const KEY = process.env.REACT_APP_ADMIN_KEY || 'dev-admin-key';

export const backendEnabled = !!API;

function headers() {
  return { 'Content-Type': 'application/json', 'x-admin-key': KEY };
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: headers(), ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res;
}

// ---------- Users ----------

export async function fetchUsers() {
  const res = await api('/api/users');
  const data = await res.json();
  return data.users;
}

export async function createUser(payload) {
  const res = await api('/api/users', {
    method: 'POST',
    body: JSON.stringify({ ...payload, approved: true, emailVerified: true })
  });
  const data = await res.json();
  return data.user;
}

export async function approveUserRemote(id, admin) {
  const res = await api(`/api/users/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ admin })
  });
  return (await res.json()).user;
}

export async function rejectUserRemote(id, admin, reason = '') {
  const res = await api(`/api/users/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ admin, reason })
  });
  return (await res.json()).user;
}

export async function deleteUserRemote(id, admin) {
  await api(`/api/users/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ admin })
  });
  return true;
}

export async function changePasswordRemote(id, password, admin) {
  const res = await api(`/api/users/${id}/password`, {
    method: 'POST',
    body: JSON.stringify({ password, admin })
  });
  return (await res.json()).user;
}

// ---------- Config ----------

export async function fetchConfig() {
  const res = await api('/api/config');
  return (await res.json()).config;
}

export async function toggleFeatureRemote(key, admin) {
  const res = await api('/api/config/toggle', {
    method: 'POST',
    body: JSON.stringify({ key, admin })
  });
  return (await res.json()).config;
}

// ---------- Audit ----------

export async function fetchAudit() {
  const res = await api('/api/audit');
  return (await res.json()).audit;
}

export async function postAudit(entry) {
  const res = await api('/api/audit', {
    method: 'POST',
    body: JSON.stringify(entry)
  });
  return (await res.json()).entry;
}

// ---------- CSV ----------

export function getUsersCsvUrl() {
  return `${API}/api/export/users.csv`;
}
