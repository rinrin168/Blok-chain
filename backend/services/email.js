const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // Return null - email sending will be skipped in dev mode
    return null;
  }
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/** Send the certificate email to the recipient. */
async function sendCertificateEmail(cert, pdfPath) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('[EMAIL] Skipped (no email config) - would email:', cert.recipientEmail);
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const verifyLink = `${frontendUrl}/verify.html?id=${cert.certificateId}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"CertChain" <noreply@certchain.edu>',
    to:   cert.recipientEmail,
    subject: `Your certificate for ${cert.courseName}`,
    text: `Hello ${cert.recipientName},

${cert.organizationName} has issued you a certificate for ${cert.courseName}.
` +
          `Certificate ID: ${cert.certificateId}
Issued: ${fmt(cert.issueDate)}
` +
          (cert.expiryDate ? `Expires: ${fmt(cert.expiryDate)}
` : '') +
          `
The PDF is attached. You can check it at any time here:
${verifyLink}
`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2e33;">
        <h2 style="margin: 0 0 16px;">Your certificate for ${esc(cert.courseName)}</h2>
        <p>Hello ${esc(cert.recipientName)},</p>
        <p>${esc(cert.organizationName)} has issued you a certificate for <strong>${esc(cert.courseName)}</strong>.
           The PDF is attached to this email.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 16px 4px 0; color: #55696f;">Certificate ID</td><td style="font-family: monospace;">${esc(cert.certificateId)}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #55696f;">Issued</td><td>${fmt(cert.issueDate)}</td></tr>
          ${cert.expiryDate ? `<tr><td style="padding: 4px 16px 4px 0; color: #55696f;">Expires</td><td>${fmt(cert.expiryDate)}</td></tr>` : ''}
        </table>
        <p>To check the certificate against the blockchain record, open
           <a href="${verifyLink}" style="color: #577e89;">${verifyLink}</a>.</p>
      </div>
    `,
    attachments: pdfPath && fs.existsSync(pdfPath) ? [{
      filename: `Certificate-${cert.certificateId}.pdf`,
      path: pdfPath,
      contentType: 'application/pdf'
    }] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent to ${cert.recipientEmail}`);
  } catch (err) {
    // Don't throw - email failure should not break issuance
    console.error('[EMAIL] Failed to send:', err.message);
  }
}

module.exports = { sendCertificateEmail };
