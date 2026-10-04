// certificates.js - Certificates list page
let allCertificates = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  setActiveNav('certificates');
  await loadCertificates();

  document.getElementById('search-input')?.addEventListener('input', renderTable);

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeFilter = tab.dataset.status;
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTable();
    });
  });

  document.getElementById('refresh-btn')?.addEventListener('click', loadCertificates);
});

async function loadCertificates() {
  const tbody = document.getElementById('cert-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center"><span class="spinner"></span></td></tr>`;

  try {
    const data = await apiRequest('GET', '/certificates', null, true);
    allCertificates = data.certificates || [];

    const s = data.stats || {};
    ['all', 'active', 'expired', 'revoked'].forEach(k => {
      const el = document.getElementById('count-' + k);
      if (el) el.textContent = k === 'all' ? (s.total || 0) : (s[k] || 0);
    });
    renderTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load: ${err.message}</td></tr>`;
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function expiryText(c) {
  if (!c.expiryDate) return '<span class="text-muted">No expiry</span>';
  const days = Math.ceil((new Date(c.expiryDate) - Date.now()) / 86400000);
  let note = '';
  if (c.status === 'active') note = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : days <= 60 ? `in ${days} days` : '';
  return `${formatDate(c.expiryDate)}${note ? `<div class="td-muted">${note}</div>` : ''}`;
}

function renderTable() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const tbody = document.getElementById('cert-tbody');
  const foot = document.getElementById('table-foot');

  const filtered = allCertificates.filter(c => {
    const matchStatus = activeFilter === 'all' || c.status === activeFilter;
    const matchSearch = !search || [c.recipientName, c.recipientEmail, c.courseName, c.certificateId]
      .some(f => f && f.toLowerCase().includes(search));
    return matchStatus && matchSearch;
  });

  foot.textContent = allCertificates.length === 0
    ? ''
    : `Showing ${filtered.length} of ${allCertificates.length} certificates`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state" style="padding:40px">
        <h3>${allCertificates.length === 0 ? 'No certificates yet' : 'No certificates found'}</h3>
        <p>${allCertificates.length === 0 ? 'Issued certificates will be listed here.' : 'Try a different search or filter.'}</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>
        <div class="person">
          <span class="avatar sm">${esc((c.recipientName || '?').trim().charAt(0).toUpperCase())}</span>
          <div>
            <div class="person-name">${esc(c.recipientName)}</div>
            <div class="td-muted">${esc(c.recipientEmail)}</div>
          </div>
        </div>
      </td>
      <td>
        <div>${esc(c.courseName)}</div>
        ${c.courseDescription ? `<div class="td-muted clip">${esc(c.courseDescription)}</div>` : ''}
      </td>
      <td class="mono">${esc(c.certificateId)}</td>
      <td class="td-muted">${formatDate(c.issueDate)}</td>
      <td class="td-muted">${expiryText(c)}</td>
      <td>${statusBadge(c.status)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-sm btn-outline" onclick="viewCert('${c._id}')" title="View details">View</button>
          <button class="btn btn-sm btn-outline" onclick="downloadPDF('${c.certificateId}')" title="Download PDF">PDF</button>
          ${c.status !== 'revoked' ? `<button class="btn btn-sm btn-danger" onclick="confirmRevoke('${c._id}', '${c.certificateId}', '${esc(c.recipientName)}')" title="Revoke">Revoke</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

async function viewCert(id) {
  const cert = allCertificates.find(c => c._id === id);
  if (!cert) return;

  const etherscanLink = cert.blockchainNetwork !== 'simulation' && cert.blockchainTxHash
    ? `<a href="https://sepolia.etherscan.io/tx/${cert.blockchainTxHash}" target="_blank">View on Etherscan</a>`
    : '<span class="text-muted">Simulation mode</span>';

  document.getElementById('modal-content').innerHTML = `
    <div class="cert-detail-grid">
      <div class="cert-detail-item"><div class="cert-detail-label">Certificate ID</div><div class="cert-detail-value mono">${cert.certificateId}</div></div>
      <div class="cert-detail-item"><div class="cert-detail-label">Status</div><div class="cert-detail-value">${statusBadge(cert.status)}</div></div>
      <div class="cert-detail-item"><div class="cert-detail-label">Recipient</div><div class="cert-detail-value">${cert.recipientName}</div></div>
      <div class="cert-detail-item"><div class="cert-detail-label">Email</div><div class="cert-detail-value mono">${cert.recipientEmail}</div></div>
      <div class="cert-detail-item"><div class="cert-detail-label">Course</div><div class="cert-detail-value">${cert.courseName}</div></div>
      <div class="cert-detail-item"><div class="cert-detail-label">Organization</div><div class="cert-detail-value">${cert.organizationName}</div></div>
      <div class="cert-detail-item"><div class="cert-detail-label">Issue Date</div><div class="cert-detail-value">${formatDate(cert.issueDate)}</div></div>
      <div class="cert-detail-item"><div class="cert-detail-label">Expiry Date</div><div class="cert-detail-value">${formatDate(cert.expiryDate)}</div></div>
    </div>
    <div class="blockchain-info mt-4">
      <div>
        <div class="bc-label">Blockchain TX Hash</div>
        <div class="bc-value">${cert.blockchainTxHash || '-'}</div>
        <div style="margin-top:4px">${etherscanLink}</div>
        <div class="bc-label" style="margin-top:8px">Network: ${cert.blockchainNetwork || 'N/A'}</div>
      </div>
    </div>
    ${cert.status === 'revoked' ? `<div class="blockchain-info revoked mt-4">
      <div>
        <div class="bc-label">Revoked At</div>
        <div class="bc-value">${formatDateTime(cert.revokedAt)}</div>
        <div class="bc-label" style="margin-top:4px">Reason: ${cert.revokedReason || 'Not specified'}</div>
      </div>
    </div>` : ''}
    <div class="flex gap-2 mt-4">
      <button class="btn btn-primary btn-sm" onclick="downloadPDF('${cert.certificateId}')">Download PDF</button>
      <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${cert.certificateId}', 'Certificate ID')">Copy ID</button>
    </div>
  `;

  document.getElementById('cert-modal').classList.add('active');
}

function downloadPDF(certId) {
  downloadCertificatePdf(certId);
}

function confirmRevoke(id, certId, name) {
  if (!confirm(`Are you sure you want to revoke the certificate for "${name}"?\n\nThis action will be recorded on the blockchain and cannot be undone.`)) return;
  revokeCert(id);
}

async function revokeCert(id) {
  try {
    await apiRequest('PATCH', `/certificates/${id}/revoke`, { reason: 'Revoked by organization admin' }, true);
    showToast('Certificate revoked and recorded on blockchain.', 'success');
    await loadCertificates();
    document.getElementById('cert-modal').classList.remove('active');
  } catch (err) {
    showToast(err.message || 'Revoke failed.', 'error');
  }
}

// Modal close
document.getElementById('close-modal')?.addEventListener('click', () => {
  document.getElementById('cert-modal').classList.remove('active');
});
document.getElementById('cert-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'cert-modal') document.getElementById('cert-modal').classList.remove('active');
});
