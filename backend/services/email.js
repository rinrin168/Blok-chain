const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // Return null — email sending will be skipped in dev mode
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

/**
 * Send certificate notification email to the recipient.
 */
async function sendCertificateEmail(cert, pdfPath) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('[EMAIL] Skipped (no email config) — would email:', cert.recipientEmail);
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const verifyLink = `${frontendUrl}/verify.html?id=${cert.certificateId}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"CertChain Platform" <noreply@certchain.edu>',
    to:   cert.recipientEmail,
    subject: `🎓 Your Certificate is Ready — ${cert.courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e8eaf0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a2440, #0f172a); padding: 32px; text-align: center; border-bottom: 1px solid rgba(79,142,247,0.3);">
          <h1 style="margin: 0; color: #4f8ef7; font-size: 24px;">🔐 CertChain</h1>
          <p style="margin: 8px 0 0; color: #8892a4; font-size: 14px;">Blockchain-Based Digital Certificate Platform</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #f7c948; margin-top: 0;">🎓 Congratulations, ${cert.recipientName}!</h2>
          <p style="color: #b8bdc8; line-height: 1.6;">
            Your digital certificate for <strong style="color: #e8eaf0;">${cert.courseName}</strong> has been issued by
            <strong style="color: #e8eaf0;">${cert.organizationName}</strong> and recorded on the Ethereum blockchain.
          </p>
          
          <div style="background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.3); border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #8892a4; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Certificate ID</p>
            <p style="margin: 0; font-family: monospace; font-size: 16px; color: #4f8ef7; font-weight: bold;">${cert.certificateId}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px 0; color: #8892a4; font-size: 14px;">Issue Date</td>
              <td style="padding: 10px 0; color: #e8eaf0; font-size: 14px; text-align: right;">${new Date(cert.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            ${cert.expiryDate ? `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px 0; color: #8892a4; font-size: 14px;">Expiry Date</td>
              <td style="padding: 10px 0; color: #e8eaf0; font-size: 14px; text-align: right;">${new Date(cert.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>` : ''}
          </table>

          <p style="color: #b8bdc8; font-size: 14px; line-height: 1.6;">
            Your certificate PDF is attached to this email. You can also verify it online at any time:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verifyLink}" style="background: linear-gradient(135deg, #4f8ef7, #7c3aed); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">
              🔍 Verify Certificate Online
            </a>
          </div>
          <p style="color: #8892a4; font-size: 12px; text-align: center; margin-top: 32px;">
            This certificate is secured by blockchain technology and cannot be altered.
          </p>
        </div>
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
    // Don't throw — email failure should not break issuance
    console.error('[EMAIL] Failed to send:', err.message);
  }
}

module.exports = { sendCertificateEmail };
