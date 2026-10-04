# Smart Contract Design

## Contract: `CertificateRegistry.sol`
**Language**: Solidity `^0.8.20`  
**Network**: Ethereum Sepolia Testnet  
**Standard**: Custom (no ERC standard required)

---

## Full Smart Contract Source

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateRegistry
 * @author [Your Name]
 * @notice Immutable on-chain registry for digital certificate hashes.
 *         Stores a SHA-256 hash of certificate data to enable tamper detection.
 */
contract CertificateRegistry {

    // ─── Data Structures ────────────────────────────────────────────────────

    struct Certificate {
        string  certificateId;   // Unique public certificate ID
        bytes32 dataHash;        // SHA-256 hash of full certificate data
        address issuedBy;        // Wallet address that issued the certificate
        uint256 issuedAt;        // Unix timestamp of issuance
        bool    isRevoked;       // True if the certificate has been revoked
        bool    exists;          // Guard flag to check existence
    }

    // ─── State Variables ─────────────────────────────────────────────────────

    address public owner;
    uint256 public totalCertificates;

    // Mapping from certificateId string to Certificate struct
    mapping(string => Certificate) private certificates;

    // ─── Events ──────────────────────────────────────────────────────────────

    event CertificateIssued(
        string indexed certificateId,
        bytes32 dataHash,
        address indexed issuedBy,
        uint256 issuedAt
    );

    event CertificateRevoked(
        string indexed certificateId,
        uint256 revokedAt
    );

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "CertificateRegistry: caller is not owner");
        _;
    }

    modifier certificateExists(string memory certificateId) {
        require(
            certificates[certificateId].exists,
            "CertificateRegistry: certificate not found"
        );
        _;
    }

    modifier certificateNotRevoked(string memory certificateId) {
        require(
            !certificates[certificateId].isRevoked,
            "CertificateRegistry: certificate already revoked"
        );
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        totalCertificates = 0;
    }

    // ─── Write Functions ──────────────────────────────────────────────────────

    /**
     * @notice Issue a new certificate on-chain.
     * @param certificateId The unique public certificate ID
     * @param dataHash      SHA-256 hash of the certificate's full data
     */
    function storeCertificate(
        string memory certificateId,
        bytes32 dataHash
    ) external onlyOwner {
        require(
            !certificates[certificateId].exists,
            "CertificateRegistry: certificate already exists"
        );

        certificates[certificateId] = Certificate({
            certificateId: certificateId,
            dataHash:       dataHash,
            issuedBy:       msg.sender,
            issuedAt:       block.timestamp,
            isRevoked:      false,
            exists:         true
        });

        totalCertificates += 1;

        emit CertificateIssued(certificateId, dataHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke an existing certificate.
     * @param certificateId The unique public certificate ID to revoke
     */
    function revokeCertificate(string memory certificateId)
        external
        onlyOwner
        certificateExists(certificateId)
        certificateNotRevoked(certificateId)
    {
        certificates[certificateId].isRevoked = true;
        emit CertificateRevoked(certificateId, block.timestamp);
    }

    // ─── Read Functions ───────────────────────────────────────────────────────

    /**
     * @notice Retrieve a certificate record.
     * @param certificateId The certificate to look up
     * @return The Certificate struct fields
     */
    function getCertificate(string memory certificateId)
        external
        view
        certificateExists(certificateId)
        returns (
            string memory id,
            bytes32 dataHash,
            address issuedBy,
            uint256 issuedAt,
            bool isRevoked
        )
    {
        Certificate memory cert = certificates[certificateId];
        return (
            cert.certificateId,
            cert.dataHash,
            cert.issuedBy,
            cert.issuedAt,
            cert.isRevoked
        );
    }

    /**
     * @notice Check if a certificate ID exists on-chain.
     */
    function certificateExistsOnChain(string memory certificateId)
        external
        view
        returns (bool)
    {
        return certificates[certificateId].exists;
    }

    /**
     * @notice Verify that a given hash matches the stored hash.
     * @param certificateId The certificate to verify
     * @param dataHash      The hash to compare against stored
     * @return true if hashes match AND certificate is not revoked
     */
    function verifyCertificate(string memory certificateId, bytes32 dataHash)
        external
        view
        certificateExists(certificateId)
        returns (bool)
    {
        Certificate memory cert = certificates[certificateId];
        return (!cert.isRevoked && cert.dataHash == dataHash);
    }
}
```

---

## Function Summary Table

| Function | Access | Gas | Description |
|----------|--------|-----|-------------|
| `storeCertificate(id, hash)` | onlyOwner | ~70k | Write new certificate to chain |
| `revokeCertificate(id)` | onlyOwner | ~35k | Mark certificate as revoked |
| `getCertificate(id)` | public | 0 (view) | Return full certificate struct |
| `verifyCertificate(id, hash)` | public | 0 (view) | Returns bool: valid or not |
| `certificateExistsOnChain(id)` | public | 0 (view) | Check existence |

---

## Events

| Event | Triggered By | Fields |
|-------|-------------|--------|
| `CertificateIssued` | `storeCertificate()` | certificateId, dataHash, issuedBy, issuedAt |
| `CertificateRevoked` | `revokeCertificate()` | certificateId, revokedAt |

---

## Hash Computation (Off-Chain)

The `dataHash` is computed in the Node.js backend before calling the contract:

```javascript
const crypto = require('crypto');

function computeCertificateHash(cert) {
  const data = JSON.stringify({
    certificateId:   cert.certificateId,
    recipientName:   cert.recipientName,
    recipientEmail:  cert.recipientEmail,
    courseName:      cert.courseName,
    organizationName: cert.organizationName,
    issueDate:       cert.issueDate,
    expiryDate:      cert.expiryDate
  });
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}
```

---

## Security Considerations
| Risk | Mitigation |
|------|-----------|
| Unauthorized issuance | `onlyOwner` modifier on all write functions |
| Double issuance of same ID | `exists` guard in `storeCertificate` |
| Re-revoking a certificate | `certificateNotRevoked` modifier |
| Hash collision | SHA-256 (collision probability negligible) |
| Private key exposure | Stored only in `.env`, never committed to git |
