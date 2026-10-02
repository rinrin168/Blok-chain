const { ethers } = require('ethers');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ABI — only the functions we call from the backend
const CONTRACT_ABI = [
  'function storeCertificate(string certificateId, bytes32 dataHash) external',
  'function revokeCertificate(string certificateId) external',
  'function getCertificate(string certificateId) external view returns (string, bytes32, address, uint256, bool)',
  'function verifyCertificate(string certificateId, bytes32 dataHash) external view returns (bool)',
  'function certificateExistsOnChain(string certificateId) external view returns (bool)',
  'event CertificateIssued(string indexed certificateId, bytes32 dataHash, address indexed issuedBy, uint256 issuedAt)',
  'event CertificateRevoked(string indexed certificateId, uint256 revokedAt)'
];

/**
 * Compute a SHA-256 hash of certificate data, formatted as bytes32 for Solidity.
 */
function computeCertificateHash(cert) {
  const data = JSON.stringify({
    certificateId:    cert.certificateId,
    recipientName:    cert.recipientName,
    recipientEmail:   cert.recipientEmail,
    courseName:       cert.courseName,
    organizationName: cert.organizationName,
    issueDate:        cert.issueDate,
    expiryDate:       cert.expiryDate || null
  });
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Returns a connected signer + contract instance, or null in simulation mode.
 */
function getContract() {
  const rpcUrl      = process.env.ETHEREUM_RPC_URL;
  const privateKey  = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddr = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddr) return null;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer   = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddr, CONTRACT_ABI, signer);
    return { provider, signer, contract };
  } catch (err) {
    console.error('[BLOCKCHAIN] Failed to connect:', err.message);
    return null;
  }
}

/**
 * Store a certificate hash on the blockchain.
 * Falls back to simulation if no blockchain config is present.
 */
async function storeCertificateOnChain(certData) {
  const hash = computeCertificateHash(certData);

  const ctx = getContract();
  if (!ctx) {
    // ── Simulation Mode ──
    const mockTxHash = 'mock-tx-0x' + crypto.randomBytes(32).toString('hex');
    console.log(`[BLOCKCHAIN] Simulation mode — mock tx: ${mockTxHash}`);
    return {
      txHash: mockTxHash,
      hash,
      network: 'simulation'
    };
  }

  try {
    const tx = await ctx.contract.storeCertificate(certData.certificateId, hash);
    const receipt = await tx.wait();
    console.log(`[BLOCKCHAIN] Certificate stored. TX: ${receipt.hash}`);
    return {
      txHash: receipt.hash,
      hash,
      network: 'sepolia'
    };
  } catch (err) {
    console.error('[BLOCKCHAIN] storeCertificate error:', err.message);
    throw new Error('Blockchain transaction failed: ' + err.message);
  }
}

/**
 * Revoke a certificate on the blockchain.
 */
async function revokeCertificateOnChain(certificateId) {
  const ctx = getContract();
  if (!ctx) {
    console.log(`[BLOCKCHAIN] Simulation mode — mock revoke for ${certificateId}`);
    return { txHash: 'mock-revoke-0x' + crypto.randomBytes(32).toString('hex') };
  }

  try {
    const tx = await ctx.contract.revokeCertificate(certificateId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  } catch (err) {
    console.error('[BLOCKCHAIN] revokeCertificate error:', err.message);
    throw new Error('Blockchain revoke failed: ' + err.message);
  }
}

/**
 * Verify a certificate against the blockchain.
 * Returns { valid, onChain, hashMatch, revoked }
 */
async function verifyCertificateOnChain(certData, storedHash) {
  const currentHash = computeCertificateHash(certData);
  const hashMatch = currentHash === storedHash;

  const ctx = getContract();
  if (!ctx) {
    return {
      valid: hashMatch && certData.status !== 'revoked',
      onChain: false,
      hashMatch,
      revoked: certData.status === 'revoked',
      network: 'simulation'
    };
  }

  try {
    const exists = await ctx.contract.certificateExistsOnChain(certData.certificateId);
    if (!exists) {
      return { valid: false, onChain: false, hashMatch: false, revoked: false, network: 'sepolia' };
    }

    const [, onChainHash, , , isRevoked] = await ctx.contract.getCertificate(certData.certificateId);
    const onChainHashHex = onChainHash;
    const chainMatch = onChainHashHex === storedHash;

    return {
      valid: chainMatch && !isRevoked,
      onChain: true,
      hashMatch: chainMatch,
      revoked: isRevoked,
      network: 'sepolia'
    };
  } catch (err) {
    console.error('[BLOCKCHAIN] verifyCertificate error:', err.message);
    return { valid: false, onChain: false, hashMatch: false, revoked: false, network: 'error' };
  }
}

module.exports = {
  computeCertificateHash,
  storeCertificateOnChain,
  revokeCertificateOnChain,
  verifyCertificateOnChain
};
