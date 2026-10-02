const express = require('express');
const Certificate = require('../models/Certificate');
const { verifyCertificateOnChain } = require('../services/blockchain');

const router = express.Router();

// ─── GET /api/verify/:certificateId ──────────────────────────────────────────
router.get('/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;

    const cert = await Certificate.findOne({ certificateId })
      .populate('issuedBy', 'organizationName email');

    if (!cert) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Certificate not found. The ID may be incorrect or the certificate was never issued on this platform.'
      });
    }

    // Determine live status
    const now = new Date();
    let liveStatus = cert.status;
    if (liveStatus === 'active' && cert.expiryDate && now > new Date(cert.expiryDate)) {
      liveStatus = 'expired';
      // Update DB
      await Certificate.findByIdAndUpdate(cert._id, { status: 'expired' });
    }

    // Blockchain verification
    const blockchainVerification = await verifyCertificateOnChain(cert.toObject(), cert.certificateHash);

    // Etherscan link
    const isSimulation = cert.blockchainNetwork === 'simulation';
    const etherscanUrl = !isSimulation && cert.blockchainTxHash
      ? `https://sepolia.etherscan.io/tx/${cert.blockchainTxHash}`
      : null;

    res.json({
      success: true,
      valid: liveStatus === 'active' && blockchainVerification.hashMatch,
      status: liveStatus,
      certificate: {
        certificateId: cert.certificateId,
        recipientName: cert.recipientName,
        courseName: cert.courseName,
        courseDescription: cert.courseDescription,
        organizationName: cert.organizationName,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
        status: liveStatus,
        revokedAt: cert.revokedAt,
        revokedReason: cert.revokedReason,
        blockchainTxHash: cert.blockchainTxHash,
        blockchainNetwork: cert.blockchainNetwork,
        etherscanUrl
      },
      blockchain: {
        verified: blockchainVerification.valid,
        onChain: blockchainVerification.onChain,
        hashMatch: blockchainVerification.hashMatch,
        network: blockchainVerification.network,
        isSimulation
      }
    });
  } catch (err) {
    console.error('[VERIFY] Error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed: ' + err.message });
  }
});

module.exports = router;
