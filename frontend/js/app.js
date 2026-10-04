// Global App Utilities
const API_BASE = '/api';

// Auth Helpers
function getToken()    { return localStorage.getItem('certchain_token'); }
function getUser()     { try { return JSON.parse(localStorage.getItem('certchain_user') || 'null'); } catch { return null; } }
function isLoggedIn()  { return !!getToken(); }

function logout() {
  localStorage.removeItem('certchain_token');
  localStorage.removeItem('certchain_user');
  window.location.href = './login.html';
}

// Redirect if not logged in
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = './login.html';
    return false;
  }
  return true;
}

// API Helper
async function apiRequest(method, endpoint, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// Authenticated File Download
// The PDF endpoint requires a Bearer token, which a plain window.open()/<a href>
// navigation can't send - fetch it with the header instead and save the blob.
async function downloadCertificatePdf(certId) {
  try {
    const res = await fetch(`${API_BASE}/certificates/${certId}/pdf`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate-${certId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast(err.message || 'Failed to download PDF.', 'error');
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// Status Badge Helper
function statusBadge(status) {
  const map = {
    active:  ['badge-success', 'Active'],
    expired: ['badge-warning', 'Expired'],
    revoked: ['badge-danger',  'Revoked'],
  };
  const [cls, label] = map[status] || ['badge-info', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

// Date Formatters
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Copy to Clipboard
async function copyToClipboard(text, label = 'Text') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  } catch {
    showToast('Copy failed. Please copy manually.', 'error');
  }
}

// Short address display
function shortHash(hash, start = 8, end = 6) {
  if (!hash) return '-';
  if (hash.length <= start + end) return hash;
  return hash.slice(0, start) + '...' + hash.slice(-end);
}

// Populate user info in navbar
function initNavbar() {
  const user = getUser();
  const orgEl = document.getElementById('navbar-org');
  if (orgEl && user) orgEl.textContent = user.organizationName || 'Organization';
  const avatar = document.getElementById('navbar-avatar');
  if (avatar && user) avatar.textContent = (user.organizationName || 'O').trim().charAt(0).toUpperCase();
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}


// Set active nav link
function setActiveNav(page) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

document.addEventListener('DOMContentLoaded', initNavbar);
