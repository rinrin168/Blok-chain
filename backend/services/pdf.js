const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// A 5-pointed star polygon (point-up) as [x,y] pairs for doc.polygon(), which
// takes one array argument per point rather than a flat list of coordinates.
function starPoints(cx, cy, outerR, innerR) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return points;
}

const STATUS_LABEL = { active: 'ACTIVE', expired: 'EXPIRED', revoked: 'REVOKED' };

// Brand palette (matches frontend/css/style.css)
const PALETTE = {
  gold:   '#E1A36F', // Harvest Gold - primary accent
  calico: '#DEC484', // Calico - secondary gold
  cream:  '#F8F5E8', // Hampton-derived page background
  card:   '#FCFAF4', // near-white card surface
  sea:    '#6F9F9C', // Sea Nymph - secondary accent
  smalt:  '#577E89', // Smalt Blue - decorative blocks
  dark:   '#27393E', // derived dark text (from Smalt Blue)
  muted:  '#4A6B74'  // derived muted text
};

/**
 * Generate a styled PDF certificate and save it to disk.
 * @param {Object} cert - The certificate data object
 * @returns {string} The absolute path to the generated PDF
 */
async function generateCertificatePDF(cert) {
  // Ensure pdfs directory exists
  const pdfDir = path.join(__dirname, '..', 'pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const filename = `Certificate-${cert.certificateId}.pdf`;
  const pdfPath = path.join(pdfDir, filename);

  // Generate QR code data URL
  const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const verifyUrl = `${frontendUrl}/verify.html?id=${cert.certificateId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 120,
    margin: 1,
    color: { dark: PALETTE.dark, light: '#ffffff' }
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    // Every element below is positioned with absolute x/y, not flowing layout -
    // margins only matter here as the auto-page-break threshold PDFKit uses for
    // .text() calls. Zero margins avoid any element near the edges silently
    // spilling onto an extra page.
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const W = doc.page.width;
    const H = doc.page.height;
    const { gold, calico, cream, card, sea, smalt, dark, muted } = PALETTE;

    // Page background
    doc.rect(0, 0, W, H).fill(cream);

    // Layered decorative blocks (top-right / bottom-left)
    // A solid Smalt Blue block with a gold-line block offset behind it -
    // the card drawn on top covers the centers, leaving an L-shaped peek
    // at each corner, echoing the layered template look.
    const blockW = 230, blockH = 190;
    doc.rect(W - blockW, 0, blockW, blockH).fill(smalt);
    doc.rect(W - blockW - 20, 20, blockW, blockH).lineWidth(2).stroke(gold);
    doc.rect(0, H - blockH, blockW, blockH).fill(smalt);
    doc.rect(20, H - blockH - 20, blockW, blockH).lineWidth(2).stroke(gold);

    // Card surface
    const cardM = 55;
    doc.rect(cardM, cardM, W - cardM * 2, H - cardM * 2).fill(card);
    doc.rect(cardM, cardM, W - cardM * 2, H - cardM * 2).lineWidth(1.5).stroke(gold);
    doc.rect(cardM + 7, cardM + 7, W - (cardM + 7) * 2, H - (cardM + 7) * 2).lineWidth(0.5).stroke(calico);

    // Header
    doc.font('Times-Bold').fontSize(38).fillColor(dark)
      .text('CERTIFICATE', 0, 86, { align: 'center', characterSpacing: 3 });
    doc.font('Times-Italic').fontSize(17).fillColor(smalt)
      .text('of Completion', 0, 132, { align: 'center' });

    doc.moveTo(W / 2 - 90, 162).lineTo(W / 2 + 90, 162).lineWidth(1).stroke(gold);

    // Body
    doc.font('Helvetica').fontSize(11).fillColor(muted)
      .text('This certificate is presented to', 0, 180, { align: 'center', characterSpacing: 1 });

    doc.font('Times-Bold').fontSize(33).fillColor(dark)
      .text(cert.recipientName, 0, 203, { align: 'center' });

    doc.font('Helvetica-Bold').fontSize(13).fillColor(smalt)
      .text(`Has successfully completed the ${cert.courseName} course`, 90, 252,
        { align: 'center', width: W - 180, height: 36, ellipsis: true });

    if (cert.courseDescription) {
      doc.font('Helvetica').fontSize(9).fillColor(muted)
        .text(cert.courseDescription, 110, 282, { align: 'center', width: W - 220, height: 22, ellipsis: true });
    }

    // Three-column detail row
    const rowY = 320;
    const rowW = 480;
    const colW = rowW / 3;
    const rowX = (W - rowW) / 2;

    const cols = [
      { label: 'CERTIFICATE ID', value: cert.certificateId, size: 10 },
      { label: 'STATUS',         value: STATUS_LABEL[cert.status] || 'ACTIVE', size: 13 },
      { label: 'NETWORK',        value: (cert.blockchainNetwork || 'simulation').toUpperCase(), size: 13 }
    ];
    cols.forEach((col, i) => {
      const cx = rowX + colW * i;
      doc.font('Times-Bold').fontSize(col.size).fillColor(dark)
        .text(col.value, cx, rowY, { width: colW, align: 'center' });
      doc.font('Helvetica').fontSize(7).fillColor(muted)
        .text(col.label, cx, rowY + 18, { width: colW, align: 'center', characterSpacing: 0.5 });
      if (i > 0) doc.moveTo(cx, rowY - 6).lineTo(cx, rowY + 28).lineWidth(0.75).stroke(calico);
    });

    // Footer: date | seal | signature
    const footerY = H - 115;

    const dateLine1 = `Issued: ${formatDate(cert.issueDate)}`;
    const dateLine2 = cert.expiryDate ? `Expires: ${formatDate(cert.expiryDate)}` : 'No Expiry';
    doc.font('Helvetica-Bold').fontSize(10).fillColor(dark)
      .text(dateLine1, cardM + 40, footerY, { width: 180 });
    doc.font('Helvetica').fontSize(9).fillColor(muted)
      .text(dateLine2, cardM + 40, footerY + 15, { width: 180 });

    // Seal (center)
    const sealCx = W / 2, sealCy = footerY + 2;
    doc.circle(sealCx, sealCy, 24).lineWidth(1.5).stroke(gold);
    doc.circle(sealCx, sealCy, 18).lineWidth(0.75).stroke(sea);
    doc.polygon(...starPoints(sealCx, sealCy, 12, 5)).fill(gold);

    // QR Code (inside card, bottom-right, clear of the decorative block)
    const qrSize = 78;
    const qrX = W - cardM - qrSize - 14;
    const qrY = H - cardM - qrSize - 30;

    // Signature (right of the seal, ending clear of the QR box)
    const sigW = 160;
    const sigX = qrX - 5 - 25 - sigW;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(dark)
      .text(cert.organizationName, sigX, footerY, { width: sigW, align: 'right' });
    doc.moveTo(sigX, footerY + 16).lineTo(sigX + sigW, footerY + 16).lineWidth(1).stroke(gold);
    doc.font('Helvetica').fontSize(8).fillColor(muted)
      .text('ISSUING ORGANIZATION', sigX, footerY + 20, { width: sigW, align: 'right', characterSpacing: 0.5 });

    doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).lineWidth(0.75).stroke(calico).fill('#ffffff');
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc.font('Helvetica').fontSize(6).fillColor(muted)
      .text('Scan to verify', qrX - 5, qrY + qrSize + 7, { width: qrSize + 10, align: 'center' });

    // Blockchain trace line
    doc.font('Helvetica').fontSize(6.5).fillColor(muted)
      .text(`Blockchain TX: ${cert.blockchainTxHash || 'pending'}`, cardM, H - cardM - 28, { width: W - cardM * 2, align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

module.exports = { generateCertificatePDF };
