# Blockchain Architecture

## Overview
The system integrates with the **Ethereum Blockchain** (Sepolia Testnet) to provide immutable, tamper-proof storage of certificate records. Only the cryptographic hash of each certificate is stored on-chain, keeping gas costs minimal while ensuring full verifiability.

---

## Why Blockchain?
| Feature | Traditional DB | Blockchain |
|---------|---------------|-----------|
| Data mutability | Can be altered | Immutable once written |
| Centralized control | Single authority | Decentralized |
| Audit trail | Optional/deletable | Permanent and public |
| Verification trust | Requires org cooperation | Trustless, anyone can verify |
| Transparency | Private | Public ledger |

---

## Blockchain Network

| Property | Value |
|----------|-------|
| **Network** | Ethereum Sepolia Testnet |
| **Chain ID** | 11155111 |
| **Currency** | SepoliaETH (free via faucet) |
| **Block Explorer** | https://sepolia.etherscan.io |
| **RPC Provider** | Infura / Alchemy (via `.env`) |
| **Interaction Library** | ethers.js v6 |

---

## On-Chain Data Model

Only the **minimum necessary data** is stored on-chain to:
- Minimize gas costs
- Protect recipient privacy (no PII on-chain)
- Maximize verification speed

```solidity
struct Certificate {
    string  certificateId;   // UUID (public ID)
    bytes32 dataHash;        // SHA-256 hash of full certificate data
    address issuedBy;        // Wallet address of issuing organization
    uint256 issuedAt;        // Unix timestamp
    bool    isRevoked;       // Revocation flag
}
```

---

## Smart Contract Interactions

### 1. `storeCertificate(certificateId, dataHash)`
- **Called by**: Backend service on certificate issuance
- **Access**: Only the contract owner (deployer wallet)
- **Effect**: Writes the certificate hash to the blockchain
- **Returns**: Emits `CertificateIssued` event

### 2. `getCertificate(certificateId)`
- **Called by**: Backend service on verification
- **Access**: Public (read-only, no gas)
- **Effect**: Returns the stored `Certificate` struct
- **Returns**: `{ certificateId, dataHash, issuedBy, issuedAt, isRevoked }`

### 3. `revokeCertificate(certificateId)`
- **Called by**: Backend on organization revoke action
- **Access**: Only the contract owner
- **Effect**: Sets `isRevoked = true` for that certificate
- **Emits**: `CertificateRevoked` event

---

## Gas Cost Estimation (Sepolia Testnet)

| Operation | Estimated Gas |
|-----------|--------------|
| Contract deployment | ~500,000 gas |
| `storeCertificate()` | ~60,000–80,000 gas |
| `revokeCertificate()` | ~30,000–40,000 gas |
| `getCertificate()` | 0 (view call) |

*All costs are in test ETH - free on Sepolia.*

---

## Blockchain Verification Flow

```
Certificate ID entered by public user
          │
          ▼
Backend fetches from MongoDB
  → Gets stored certificateHash (from issue time)
          │
          ▼
Backend calls smart contract: getCertificate(id)
  → Gets onChainHash
          │
          ▼
Backend recomputes hash from current MongoDB data
  → Gets currentHash
          │
   ┌──────┴──────────────────────────────┐
   │  onChainHash == currentHash?         │
   └──────┬──────────────────────────────┘
          │
       ┌──┴──┐
      Yes    No
       │      └── Certificate has been tampered!
       ▼
  Check isRevoked → Revoked? → Status = REVOKED
       │
  Check expiryDate → Past? → Status = EXPIRED
       │
  All clear → Status = VALID
```

---

## Deployment Setup

```bash
# 1. Install dependencies
npm install ethers dotenv

# 2. Set environment variables in .env
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT_ADDRESS

# 3. Deploy contract (via deploy.js script)
node backend/scripts/deploy.js

# 4. Copy contract address to .env
CONTRACT_ADDRESS=0x<deployed address>
```

---

## Fallback Mode (Demo / Without Wallet)
When `ETHEREUM_RPC_URL` or `DEPLOYER_PRIVATE_KEY` is not set, the blockchain service automatically falls back to **simulation mode**:
- Generates a mock transaction hash (`mock-tx-0x...`)
- Records `blockchainNetwork: "simulation"`
- All other features (PDF, email, verification) work normally
- Clearly labeled as "Simulated" in the verification UI
