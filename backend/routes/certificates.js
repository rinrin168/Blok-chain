const express = require('express');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const protect = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const { storeCertificateOnChain, revokeCertificateOnChain, computeCertificateHash } = require('../services/blockchain');
const { generateCertificatePDF } = require('../services/pdf');
const { sendCertificateEmail } = require('../services/email');

const router = express.Router();

// All routes protected
router.use(protect);

// :id may be a Mongo _id or a public certificateId (e.g. "CERT-XXXX"). Mongoose
// casts every branch of an $or up front, so including a non-ObjectId string
// under _id throws a CastError instead of just not matching — only add that
// branch when the id actually looks like an ObjectId.
function findCertQuery(id, issuedBy) {
  const query = { issuedBy };
  query.$or = mongoose.Types.ObjectId.isValid(id)
    ? [{ _id: id }, { certificateId: id }]
    : [{ certificateId: id }];
  return query;
}

// ─── POST /api/certificates/issue ────────────────────────────────────────────
router.post('/issue', async (req, res) => {
  try {
    const { recipientName, recipientEmail, courseName, courseDescription, issueDate, expiryDate } = req.body;

    if (!recipientName || !recipientEmail || !courseName || !issueDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Generate unique certificate ID
    const certificateId = 'CERT-' + uuidv4().split('-')[0].toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const certData = {
      certificateId,
      recipientName:    recipientName.trim(),
      recipientEmail:   recipientEmail.trim().toLowerCase(),
      courseName:       courseName.trim(),
      courseDescription: courseDescription || '',
      organizationName: req.user.organizationName,
      issuedBy:         req.user._id,
      issueDate:        new Date(issueDate),
      expiryDate:       expiryDate ? new Date(expiryDate) : null
    };

    // 1. Store on blockchain
    const blockchainResult = await storeCertificateOnChain(certData);

    // 2. Save to MongoDB
    const certificate = await Certificate.create({
      ...certData,
      certificateHash:    blockchainResult.hash,
      blockchainTxHash:   blockchainResult.txHash,
      blockchainNetwork:  blockchainResult.network,
      status: 'active'
    });

    // 3. Generate PDF
    let pdfPath = null;
    try {
      pdfPath = await generateCertificatePDF({ ...certificate.toObject(), blockchainTxHash: blockchainResult.txHash, blockchainNetwork: blockchainResult.network });
      await Certificate.findByIdAndUpdate(certificate._id, { pdfPath });
    } catch (pdfErr) {
      console.error('[PDF] Generation failed:', pdfErr.message);
    }

    // 4. Send email (non-blocking)
    sendCertificateEmail(certificate.toObject(), pdfPath).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully.',
      certificate: {
        id: certificate._id,
        certificateId: certificate.certificateId,
        recipientName: certificate.recipientName,
        recipientEmail: certificate.recipientEmail,
        courseName: certificate.courseName,
        organizationName: certificate.organizationName,
        issueDate: certificate.issueDate,
        expiryDate: certificate.expiryDate,
        blockchainTxHash: blockchainResult.txHash,
        blockchainNetwork: blockchainResult.network,
        status: 'active',
        pdfAvailable: !!pdfPath
      }
    });
  } catch (err) {
    console.error('[CERT] Issue error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to issue certificate.' });
  }
});

// ─── GET /api/certificates ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { issuedBy: req.user._id };

    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { recipientName: { $regex: search, $options: 'i' } },
        { recipientEmail: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } },
        { certificateId: { $regex: search, $options: 'i' } }
      ];
    }

    const certificates = await Certificate.find(query).sort({ createdAt: -1 });

    // Update expired status automatically
    const now = new Date();
    const updated = certificates.map(cert => {
      const obj = cert.toObject();
      if (obj.status === 'active' && obj.expiryDate && now > new Date(obj.expiryDate)) {
        obj.status = 'expired';
      }
      return obj;
    });

    const stats = {
      total: updated.length,
      active: updated.filter(c => c.status === 'active').length,
      expired: updated.filter(c => c.status === 'expired').length,
      revoked: updated.filter(c => c.status === 'revoked').length
    };

    res.json({ success: true, certificates: updated, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/certificates/stats ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const all = await Certificate.find({ issuedBy: req.user._id });
    const now = new Date();
    let active = 0, expired = 0, revoked = 0;

    all.forEach(cert => {
      if (cert.status === 'revoked') revoked++;
      else if (cert.expiryDate && now > new Date(cert.expiryDate)) expired++;
      else active++;
    });

    res.json({ success: true, stats: { total: all.length, active, expired, revoked } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/certificates/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const cert = await Certificate.findOne(findCertQuery(req.params.id, req.user._id));

    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    res.json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/certificates/:id/pdf ───────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  try {
    const cert = await Certificate.findOne(findCertQuery(req.params.id, req.user._id));

    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    let pdfPath = cert.pdfPath;

    // Regenerate if not found
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      pdfPath = await generateCertificatePDF(cert.toObject());
      await Certificate.findByIdAndUpdate(cert._id, { pdfPath });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificate-${cert.certificateId}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/certificates/:id/revoke ──────────────────────────────────────
router.patch('/:id/revoke', async (req, res) => {
  try {
    const cert = await Certificate.findOne(findCertQuery(req.params.id, req.user._id));

    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    if (cert.status === 'revoked') return res.status(400).json({ success: false, message: 'Certificate is already revoked.' });

    // Revoke on blockchain
    await revokeCertificateOnChain(cert.certificateId);

    // Update DB
    cert.status = 'revoked';
    cert.revokedAt = new Date();
    cert.revokedReason = req.body.reason || 'Revoked by organization';
    await cert.save();

    res.json({ success: true, message: 'Certificate revoked successfully.', certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
