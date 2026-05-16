// ── API helpers ────────────────────────────────────────────────────────────
const API = '/api';

function getToken() { return localStorage.getItem('ttm_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('ttm_user')); } catch { return null; } }
function setSession(user, token) {
  localStorage.setItem('ttm_token', token);
  localStorage.setItem('ttm_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('ttm_token');
  localStorage.removeItem('ttm_user');
}

function requireAuth() {
  if (!getToken()) { window.location.href = '/index.html'; return false; }
  return true;
}
function redirectIfAuthed() {
  if (getToken()) { window.location.href = '/dashboard.html'; }
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts.headers || {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Toast notifications
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Utilities
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function isOverdue(d, status) {
  if (!d || status === 'done') return false;
  return new Date(d) < new Date(new Date().toDateString());
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function statusLabel(s) {
  return { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }[s] || s;
}
function priorityLabel(p) {
  return { low: '🟢 Low', medium: '🟡 Medium', high: '🔴 High' }[p] || p;
}

// Sidebar active state
function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
}

// Build sidebar user footer
function renderSidebarUser() {
  const u = getUser();
  if (!u) return;
  const el = document.getElementById('sidebar-user');
  if (el) el.innerHTML = `
    <div class="user-card">
      <div class="user-avatar">${initials(u.name)}</div>
      <div class="user-info" style="min-width:0">
        <div class="user-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name}</div>
        <span class="user-role ${u.role}">${u.role}</span>
      </div>
    </div>
  `;
}

function doLogout() {
  clearSession();
  window.location.href = '/index.html';
}
