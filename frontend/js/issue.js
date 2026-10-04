// issue.js - Issue Certificate page
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  setActiveNav('issue');

  const form       = document.getElementById('issue-form');
  const submitBtn  = document.getElementById('submit-btn');
  const formArea   = document.getElementById('form-area');
  const successArea = document.getElementById('success-area');

  // Set default issue date to today
  const issueDateInput = document.getElementById('issue-date');
  if (issueDateInput) issueDateInput.value = new Date().toISOString().split('T')[0];

  setupPreview();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const payload = {
      recipientName:    document.getElementById('recipient-name').value.trim(),
      recipientEmail:   document.getElementById('recipient-email').value.trim(),
      courseName:       document.getElementById('course-name').value.trim(),
      courseDescription: document.getElementById('course-desc').value.trim(),
      issueDate:        document.getElementById('issue-date').value,
      expiryDate:       document.getElementById('expiry-date').value || null
    };

    let valid = true;
    if (!payload.recipientName) { showFieldError('recipient-name', 'Recipient name is required.'); valid = false; }
    if (!payload.recipientEmail) { showFieldError('recipient-email', 'Email is required.'); valid = false; }
    if (!payload.courseName) { showFieldError('course-name', 'Course name is required.'); valid = false; }
    if (!payload.issueDate) { showFieldError('issue-date', 'Issue date is required.'); valid = false; }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Recording on blockchain...';

    try {
      const data = await apiRequest('POST', '/certificates/issue', payload, true);
      const cert = data.certificate;

      // Show success
      formArea.classList.add('hidden');
      successArea.classList.remove('hidden');

      document.getElementById('success-cert-id').textContent = cert.certificateId;
      document.getElementById('success-name').textContent = cert.recipientName;
      document.getElementById('success-course').textContent = cert.courseName;
      document.getElementById('success-tx').textContent = shortHash(cert.blockchainTxHash, 12, 8);
      document.getElementById('success-tx').setAttribute('title', cert.blockchainTxHash);
      document.getElementById('success-network').textContent = cert.blockchainNetwork;

      const downloadBtn = document.getElementById('download-pdf-btn');
      if (downloadBtn) {
        downloadBtn.onclick = () => downloadCertificatePdf(cert.certificateId);
      }

      document.getElementById('copy-cert-id').onclick = () => copyToClipboard(cert.certificateId, 'Certificate ID');

      showToast('Certificate issued and recorded on blockchain!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to issue certificate.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Issue Certificate';
    }
  });

  document.getElementById('issue-another-btn')?.addEventListener('click', () => {
    form.reset();
    clearErrors();
    successArea.classList.add('hidden');
    formArea.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Issue Certificate';
    document.getElementById('issue-date').value = new Date().toISOString().split('T')[0];
  });
});

function showFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('error');
  const err = field.parentElement.querySelector('.form-error');
  if (err) err.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll('.form-control.error').forEach(f => f.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
}

function setupPreview() {
  const user = getUser();
  const fields = ['recipient-name', 'course-name', 'issue-date', 'expiry-date'];
  const fmt = v => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const update = () => {
    const name = document.getElementById('recipient-name').value.trim();
    const course = document.getElementById('course-name').value.trim();
    const issued = document.getElementById('issue-date').value;
    const expires = document.getElementById('expiry-date').value;

    document.getElementById('prev-name').textContent = name || 'Recipient name';
    document.getElementById('prev-course').textContent = course
      ? `Has successfully completed the ${course} course`
      : 'Has successfully completed the course';
    const parts = [];
    if (issued) parts.push(`Issued ${fmt(issued)}`);
    parts.push(expires ? `Expires ${fmt(expires)}` : 'No expiry');
    document.getElementById('prev-dates').textContent = parts.join('  |  ');
    document.getElementById('prev-org').textContent = (user && user.organizationName) || 'Organization';
  };

  fields.forEach(id => document.getElementById(id).addEventListener('input', update));
  update();
}
