// dashboard.js - Dashboard page logic
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  setActiveNav('dashboard');

  const user = getUser();
  if (user) {
    document.getElementById('org-name').textContent = user.organizationName || 'Organization';
  }

  loadStats();
  loadChainInfo();
  loadActivity();
});

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function timeAgo(date) {
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
}

function daysUntil(date) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

async function loadStats() {
  try {
    const { stats: s } = await apiRequest('GET', '/certificates/stats', null, true);
    animateCount('stat-total', s.total);
    animateCount('stat-active', s.active);
    animateCount('stat-expired', s.expired);
    animateCount('stat-revoked', s.revoked);

    const bar = document.getElementById('segbar');
    if (s.total > 0) {
      const pct = n => (n / s.total * 100).toFixed(2);
      bar.innerHTML =
        `<span class="seg seg-active" style="width:${pct(s.active)}%"></span>` +
        `<span class="seg seg-expired" style="width:${pct(s.expired)}%"></span>` +
        `<span class="seg seg-revoked" style="width:${pct(s.revoked)}%"></span>`;
    }
  } catch (err) {
    console.error('Stats error:', err.message);
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

async function loadChainInfo() {
  const box = document.getElementById('chain-info');
  try {
    const { chain } = await apiRequest('GET', '/certificates/chain-info', null, true);
    if (chain.mode === 'simulation') {
      box.innerHTML = `
        <dt>Network</dt><dd><span class="badge badge-warning">Simulation</span></dd>
        <dt>Note</dt><dd>No transaction is written to a real chain. Set the three Ethereum values in <code>.env</code> to record certificates on Sepolia.</dd>`;
      return;
    }
    const short = `${chain.contractAddress.slice(0, 8)}...${chain.contractAddress.slice(-6)}`;
    box.innerHTML = `
      <dt>Network</dt><dd><span class="badge badge-success">Sepolia</span></dd>
      <dt>Contract</dt><dd><a href="${esc(chain.explorerUrl)}" target="_blank" rel="noopener" class="mono">${esc(short)}</a></dd>
      <dt>Recorded on-chain</dt><dd>${chain.onChainTotal ?? 'unavailable'}</dd>`;
  } catch (err) {
    box.innerHTML = '<dt>Status</dt><dd class="text-danger">Could not read the chain</dd>';
  }
}

async function loadActivity() {
  const timeline = document.getElementById('timeline');
  const expiring = document.getElementById('expiring');
  try {
    const { certificates } = await apiRequest('GET', '/certificates', null, true);

    const events = [];
    certificates.forEach(c => {
      events.push({ type: 'issued', at: c.createdAt, cert: c });
      if (c.revokedAt) events.push({ type: 'revoked', at: c.revokedAt, cert: c });
    });
    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    timeline.innerHTML = events.length === 0
      ? '<li class="timeline-empty">Nothing yet. Issue the first certificate to start the log.</li>'
      : events.slice(0, 8).map(e => `
        <li class="timeline-item ${e.type}">
          <div class="timeline-title">${e.type === 'issued' ? 'Issued to' : 'Revoked for'} ${esc(e.cert.recipientName)}</div>
          <div class="timeline-meta">${esc(e.cert.courseName)} &middot; <span class="mono">${esc(e.cert.certificateId)}</span> &middot; ${timeAgo(e.at)}</div>
        </li>`).join('');

    const soon = certificates
      .filter(c => c.status === 'active' && c.expiryDate)
      .filter(c => { const d = new Date(c.expiryDate) - Date.now(); return d > 0 && d <= 30 * 86400000; })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    expiring.innerHTML = soon.length === 0
      ? '<li class="timeline-empty">No certificates expire in the next 30 days.</li>'
      : soon.map(c => `
        <li>
          <div><strong>${esc(c.recipientName)}</strong><div class="td-muted">${esc(c.courseName)}</div></div>
          <div class="row-when">${daysUntil(c.expiryDate)}<div class="td-muted">${formatDate(c.expiryDate)}</div></div>
        </li>`).join('');
  } catch (err) {
    timeline.innerHTML = '<li class="timeline-empty">Failed to load activity.</li>';
    expiring.innerHTML = '<li class="timeline-empty">Failed to load.</li>';
  }
}
