// verify.js - Public certificate verification page
document.addEventListener('DOMContentLoaded', () => {
  // Check URL param
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  if (idParam) {
    document.getElementById('cert-id-input').value = idParam;
    verifyCertificate(idParam);
  }

  document.getElementById('verify-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('cert-id-input').value.trim();
    if (!id) { showToast('Please enter a Certificate ID.', 'warning'); return; }
    verifyCertificate(id);
  });

  // QR scanner toggle
  const scanBtn = document.getElementById('scan-qr-btn');
  const qrSection = document.getElementById('qr-section');
  let scanning = false;

  scanBtn?.addEventListener('click', () => {
    scanning = !scanning;
    qrSection.classList.toggle('hidden', !scanning);
    scanBtn.textContent = scanning ? 'Close Scanner' : 'Scan QR Code';
    if (scanning) startQRScanner();
    else stopQRScanner();
  });
});

async function verifyCertificate(certId) {
  const resultArea  = document.getElementById('result-area');
  const verifyBtn   = document.getElementById('verify-btn');
  const loadingArea = document.getElementById('loading-area');

  resultArea.classList.add('hidden');
  loadingArea.classList.remove('hidden');
  if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = '<span class="spinner"></span> Verifying...'; }

  try {
    const data = await fetch(`${API_BASE}/verify/${encodeURIComponent(certId)}`);
    const result = await data.json();
    loadingArea.classList.add('hidden');
    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = 'Verify'; }
    renderVerifyResult(result);
    resultArea.classList.remove('hidden');
  } catch (err) {
    loadingArea.classList.add('hidden');
    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = 'Verify'; }
    renderVerifyResult({ success: false, message: 'Could not reach the server. Is the backend running?' });
    resultArea.classList.remove('hidden');
  }
}

function renderVerifyResult(result) {
  const container = document.getElementById('result-container');

  if (!result.success) {
    container.innerHTML = `
      <div class="verify-result invalid animate-fade-in">
        <div class="verify-status-banner revoked">
          <div class="verify-status-text">
            <h3 style="color:var(--danger)">Certificate Not Found</h3>
            <p>${result.message || 'This certificate ID does not exist in our system.'}</p>
          </div>
        </div>
      </div>`;
    return;
  }

  const cert   = result.certificate;
  const chain  = result.blockchain;
  const status = result.status;

  const statusConfig = {
    active:  { cls: 'valid',   color: 'var(--success)', title: 'CERTIFICATE VALID', desc: 'This certificate is authentic and currently valid.' },
    expired: { cls: 'expired', color: 'var(--warning)', title: 'CERTIFICATE EXPIRED', desc: 'This certificate has passed its expiry date.' },
    revoked: { cls: 'revoked', color: 'var(--danger)',  title: 'CERTIFICATE REVOKED', desc: 'This certificate has been revoked by the issuing organization.' },
  };
  const cfg = statusConfig[status] || { cls: 'invalid', color: 'var(--danger)', title: 'INVALID', desc: 'This certificate cannot be verified.' };

  const etherscanBtn = cert.etherscanUrl
    ? `<a href="${cert.etherscanUrl}" target="_blank" class="btn btn-outline btn-sm">View on Etherscan</a>`
    : '';

  const simulationNote = chain.isSimulation
    ? `<div class="badge badge-info" style="margin-top:8px">Simulation mode, not on a real chain</div>`
    : '';

  container.innerHTML = `
    <div class="verify-result ${cfg.cls} animate-fade-in">
      <div class="verify-status-banner ${cfg.cls}">
        <div class="verify-status-text">
          <h3 style="color:${cfg.color}">${cfg.title}</h3>
          <p style="color:var(--text-muted)">${cfg.desc}</p>
        </div>
      </div>

      <div class="cert-detail-grid">
        <div class="cert-detail-item">
          <div class="cert-detail-label">Certificate ID</div>
          <div class="cert-detail-value mono">${cert.certificateId}</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Status</div>
          <div class="cert-detail-value">${statusBadge(status)}</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Recipient</div>
          <div class="cert-detail-value">${cert.recipientName}</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Issuing Organization</div>
          <div class="cert-detail-value">${cert.organizationName}</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Course / Program</div>
          <div class="cert-detail-value">${cert.courseName}</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Issue Date</div>
          <div class="cert-detail-value">${formatDate(cert.issueDate)}</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Expiry Date</div>
          <div class="cert-detail-value">${cert.expiryDate ? formatDate(cert.expiryDate) : 'No expiry'}</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Hash Verified</div>
          <div class="cert-detail-value">${chain.hashMatch ? '<span class="text-success">Match</span>' : '<span class="text-danger">Mismatch</span>'}</div>
        </div>
      </div>

      ${cert.courseDescription ? `
      <div class="notice" style="margin-top:16px">
        <div class="cert-detail-label">Description</div>
        <p style="font-size:14px;margin-top:4px">${cert.courseDescription}</p>
      </div>` : ''}

      <div class="blockchain-info mt-4">
        <div>
          <div class="bc-label">Blockchain Transaction</div>
          <div class="bc-value">${cert.blockchainTxHash || '-'}</div>
          <div class="bc-label" style="margin-top:6px">Network: ${cert.blockchainNetwork || 'N/A'}</div>
          ${simulationNote}
          <div style="margin-top:8px">${etherscanBtn}</div>
        </div>
      </div>

      ${status === 'revoked' ? `
      <div class="blockchain-info revoked mt-4">
        <div>
          <div class="bc-label">Revocation Details</div>
          <div class="bc-value" style="color:var(--danger)">${formatDateTime(cert.revokedAt)}</div>
          ${cert.revokedReason ? `<div class="bc-label" style="margin-top:4px">Reason: ${cert.revokedReason}</div>` : ''}
        </div>
      </div>` : ''}

      <div class="flex gap-2 mt-4" style="flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${cert.certificateId}', 'Certificate ID')">Copy ID</button>
      </div>
    </div>`;
}

// QR Scanner using HTML5 camera
let videoStream = null;
let scanInterval = null;

async function startQRScanner() {
  const video   = document.getElementById('qr-video');
  const canvas  = document.getElementById('qr-canvas');
  const ctx     = canvas?.getContext('2d');
  const status  = document.getElementById('qr-status');

  if (!video || !canvas || !ctx) return;
  if (status) status.textContent = 'Requesting camera access...';

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = videoStream;
    video.play();
    if (status) status.textContent = 'Point the camera at the QR code on the certificate.';

    scanInterval = setInterval(() => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Use jsQR if available (loaded via CDN in HTML)
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const url = code.data;
          // Extract cert ID from URL
          const match = url.match(/[?&]id=([^&]+)/);
          const certId = match ? match[1] : url;
          document.getElementById('cert-id-input').value = certId;
          stopQRScanner();
          document.getElementById('qr-section').classList.add('hidden');
          document.getElementById('scan-qr-btn').textContent = 'Scan QR Code';
          verifyCertificate(certId);
        }
      }
    }, 300);
  } catch (err) {
    if (status) status.textContent = 'Camera access denied. Please enter Certificate ID manually.';
  }
}

function stopQRScanner() {
  if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
}
