# System Overview

## Project Title
**Blockchain-Based Digital Certificate Issuing Platform**

## Project Summary
Traditional PDF certificates can be easily copied, modified, or forged, making it difficult to verify their authenticity. This project proposes and implements a **Digital Certificate Issuing Platform** that leverages blockchain technology to provide secure, tamper-resistant, and publicly verifiable digital certificates.

An educational institution or training organization can use this platform to issue certificates to recipients. Each certificate is cryptographically hashed and its record is stored on the Ethereum blockchain (Sepolia testnet). Any member of the public can then verify a certificate's authenticity in real time without needing to contact the issuing organization.

---

## Problem Statement
| Problem | Impact |
|---------|--------|
| PDF certificates can be forged or modified | Employers and institutions cannot trust certificate validity |
| No decentralized verification mechanism | Verification requires contacting the issuing body directly |
| No expiry or revocation tracking | Outdated or revoked credentials continue to circulate |
| No audit trail | No way to prove when a certificate was issued |

---

## Solution
The platform provides two main portals:

### 1. Organization Portal (Private)
- Authenticated login for the issuing organization
- A form to issue certificates with recipient details, course, date, and expiry
- Auto-generation of a downloadable PDF certificate with embedded QR code
- Recording of the certificate hash on the Ethereum blockchain
- Email notification sent automatically to the certificate recipient
- A management dashboard to view, track, and revoke certificates

### 2. Public Verification Portal
- Anyone can enter a **Certificate ID** or scan the **QR Code** from the PDF
- The system fetches the certificate from the database and validates it against the blockchain record
- Displays the certificate details, blockchain transaction hash, and current status:
  - **Valid** - Active and not expired
  - **Expired** - Past the expiry date
  - **Revoked** - Cancelled by the issuing organization

---

## Key Benefits
- **Immutability**: Certificate records on the blockchain cannot be altered
- **Transparency**: Anyone can view the blockchain transaction independently
- **Decentralization**: Verification does not rely on the issuing organization being online
- **Automation**: Email, PDF, QR code, and blockchain recording are all automated at issuance
- **Accessibility**: Public verification requires no login or account

---

## Scope
| In Scope | Out of Scope |
|----------|-------------|
| Single organization issuing portal | Multi-tenant organization management |
| Ethereum Sepolia testnet | Mainnet deployment (requires real ETH) |
| Certificate issuance, revocation, expiry | Certificate templates customization |
| Email notification at issuance | SMS or push notifications |
| PDF + QR code generation | Physical printing integration |
