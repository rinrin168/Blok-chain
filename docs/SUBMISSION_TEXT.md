# CertChain: Submission Text (copy and paste)

Everything below is written to match the application as it is built. Fill in the items marked [FILL IN]. Figure numbers refer to the diagram files in `docs/diagrams/`.

## Checklist: what the PDF must contain

| # | Required item | Where it is below | Your action |
|---|---------------|-------------------|-------------|
| 1 | System Overview | Section 1 | Paste |
| 2 | System Architecture | Section 2 + Figure 1 | Paste, insert figure |
| 3 | User Flow / System Flow | Section 3 + Figures 2, 3, 4 | Paste, insert figures |
| 4 | Database Design (ER Diagram) | Section 4 + Figure 5 | Paste, insert figure |
| 5 | Blockchain Architecture | Section 5 + Figure 6 | Paste, insert figure |
| 6 | Smart Contract Design | Section 6 + Figures 7, 8 | Paste, insert figures |
| 7 | User Interface Design or Screenshots | Section 7 | Take the screenshots listed |
| 8 | Implementation Summary | Section 8 | Paste |
| 9 | Public GitHub Repository Link | Section 9 | [FILL IN] the URL |
| 10 | Individual Contribution Report | Section 10 | [FILL IN] name and student ID |
| 11 | Public Demo Video Link | Section 11 | [FILL IN] the URL |

Before you submit, check that the GitHub repository is public, the video link opens in a private browser window without logging in, and the PDF is a single file.

---

## Cover page

- **Project title:** CertChain, a Blockchain-Based Digital Certificate Issuing Platform
- **Student name:** [FILL IN]
- **Student ID:** [FILL IN]
- **Team arrangement:** Individual
- **GitHub repository:** [FILL IN]
- **Demo video:** [FILL IN]
- **Smart contract (Sepolia):** 0xf906749DEfE0c65EDFc6F7C00F8D57021AEf3F68 (https://sepolia.etherscan.io/address/0xf906749DEfE0c65EDFc6F7C00F8D57021AEf3F68)

---

## 1. System Overview

Traditional PDF certificates can be copied or edited, so a reader cannot tell whether a certificate is genuine. CertChain addresses this by recording a cryptographic hash of every certificate in a smart contract on the Ethereum Sepolia test network. Anyone can then check a certificate against that record using its ID or the QR code printed on it.

**Users**
- **Organization (login required):** signs in, issues certificates, downloads the PDF, views all issued certificates, and revokes a certificate.
- **Public user (no login):** verifies a certificate by ID or QR code and sees its details, its status and the blockchain transaction.

**Main features**
- Organization login with JWT authentication.
- Certificate creation with recipient, course, description, issue date and optional expiry date.
- PDF certificate with an embedded QR code, available for download.
- Certificate hash recorded on the blockchain at issue time.
- Email notification to the recipient with the PDF attached.
- Public verification by certificate ID or QR code, showing one of three statuses: Valid, Expired or Revoked.
- Display of the blockchain transaction hash and a link to Etherscan.
- Certificate expiration management: a certificate past its expiry date is reported as Expired.
- Certificate revocation: the organization can revoke a certificate, and the revocation is written to the contract.
- Organization dashboard with totals, a status breakdown, an activity timeline, certificates expiring in the next 30 days, and the state of the blockchain connection.

**Technology:** Node.js, Express, MongoDB (Atlas) with Mongoose, Solidity, ethers.js, Infura, Remix IDE, PDFKit, qrcode, Nodemailer, and plain HTML, CSS and JavaScript for the interface.

---

## 2. System Architecture (Figure 1)

CertChain is a three-tier web application with a blockchain layer.

**Client layer.** Static HTML, CSS and JavaScript pages: home, verify, login, dashboard, issue certificate and certificates list. The browser calls the server's JSON API with `fetch`. A JWT is kept in the browser's local storage and sent as a Bearer token on protected requests.

**Application layer.** One Node.js and Express server on port 5000 that serves both the static frontend and the API.
- `routes/auth.js`: login and current-user endpoints.
- `routes/certificates.js`: issue, list, stats, chain information, details, PDF download and revoke. All routes require a valid JWT.
- `routes/verify.js`: the public verification endpoint.
- `middleware/auth.js`: checks the JWT and loads the user.
- `models/`: Mongoose schemas for users and certificates.
- `services/blockchain.js`: hashing and all contract calls through ethers.js.
- `services/pdf.js`: PDF generation with PDFKit and QR codes with qrcode.
- `services/email.js`: email delivery with Nodemailer.

**Data layer.** MongoDB Atlas holds the `users` and `certificates` collections.

**Blockchain layer.** The `CertificateRegistry` smart contract on Ethereum Sepolia. The backend reaches it through Infura's JSON-RPC endpoint, signing transactions with a dedicated wallet whose key is kept in the server's `.env` file.

**External services.** Infura for the Ethereum connection and an SMTP server (Gmail) for email.

**Security.** Passwords are hashed with bcrypt (12 rounds). Protected endpoints require a JWT that expires after 24 hours. Only the contract owner can store or revoke certificates. Secrets (database URI, JWT secret, wallet key, email password) are read from environment variables and are excluded from the repository.

**Simulation mode.** If the RPC URL, wallet key or contract address are not configured, the blockchain service computes the same hash but returns a mock transaction hash and writes nothing on-chain. This lets the project run without a wallet. The submitted demonstration runs in live mode against Sepolia.

---

## 3. User Flow and System Flow

### 3.1 User flow (Figure 2)

**Organization**
1. Open the site and go to Organization login.
2. Enter email and password. A wrong password shows an error and returns to the form.
3. The dashboard opens. From there the organization can issue a certificate, open the certificates list, or log out.
4. To issue: fill in the form and submit. The server hashes the data, writes the hash to the contract, saves the record, builds the PDF and sends the email. A success screen shows the certificate ID, the transaction hash and a download button.
5. To revoke: open the certificates list, choose Revoke and confirm. The contract and the database are both updated.

**Public user**
1. Open the verify page. No login is needed.
2. Enter the certificate ID, or scan the QR code with the camera.
3. The server reads the record and the contract. If the record is not found, the page says so. If the hash does not match the chain, the result is not valid.
4. Otherwise the status is shown: Valid, Expired or Revoked, with the certificate details and the transaction.

### 3.2 System flow: issuing a certificate (Figure 3)
1. The browser sends `POST /api/certificates/issue` with the JWT and the form data.
2. The server validates the token and input, creates a certificate ID, and computes the SHA-256 hash of the certificate data.
3. The server calls `storeCertificate(id, dataHash)` on the contract and waits for the receipt.
4. The server saves the certificate, with the transaction hash, in MongoDB.
5. The server generates the PDF with a QR code.
6. The server sends the email with the PDF attached. This is not awaited, so an email failure does not fail the request.
7. The server answers `201 Created` with the certificate ID and the transaction hash.
8. When the user presses Download PDF, the browser requests `GET /api/certificates/:id/pdf` with the Bearer token and saves the file.

### 3.3 System flow: verifying a certificate (Figure 4)
1. The browser sends `GET /api/verify/:certificateId`.
2. The server finds the certificate in MongoDB.
3. The server checks the expiry date. An active certificate past its expiry date is treated as expired.
4. The server recomputes the SHA-256 hash from the stored record.
5. The server asks the contract whether the certificate exists, and reads the stored hash and the revoked flag.
6. The server compares the hashes and decides the status.
7. The server returns the status, the certificate fields, the transaction hash, the network and an Etherscan link.

---

## 4. Database Design (Figure 5)

MongoDB with Mongoose. Two collections. One organization (user) issues many certificates (one-to-many through `issuedBy`).

### users

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary key |
| organizationName | String | Required |
| email | String | Required, unique, lowercase |
| password | String | bcrypt hash, never returned by queries |
| role | String | "admin" |
| createdAt, updatedAt | Date | Automatic |

### certificates

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary key |
| certificateId | String | Required, unique. Public ID, format `CERT-XXXXXXXX-XXXXXXXX` |
| recipientName | String | Required |
| recipientEmail | String | Required |
| courseName | String | Required |
| courseDescription | String | Optional |
| issuedBy | ObjectId | Foreign key to users._id |
| organizationName | String | Copied from the issuing user |
| issueDate | Date | Required |
| expiryDate | Date | Optional |
| certificateHash | String | SHA-256 of the certificate data |
| blockchainTxHash | String | Transaction hash of the store call |
| blockchainNetwork | String | "sepolia" (or "simulation") |
| status | String | active, expired or revoked |
| revokedAt | Date | Set when revoked |
| revokedReason | String | Set when revoked |
| pdfPath | String | Location of the generated PDF |
| createdAt, updatedAt | Date | Automatic |

**Indexes:** `users.email` (unique), `certificates.certificateId` (unique), `certificates.issuedBy`, `certificates.recipientEmail`.

---

## 5. Blockchain Architecture (Figure 6)

**Network.** Ethereum Sepolia test network. The contract is deployed at `0xf906749DEfE0c65EDFc6F7C00F8D57021AEf3F68`. Deployment was done from Remix IDE with MetaMask.

**What is stored on-chain.** Only a hash and minimal metadata, never personal data. For each certificate the contract keeps: the certificate ID, the 32-byte data hash, the address that issued it, the issue timestamp and a revoked flag.

**How the hash is made.** The backend builds a JSON string from these fields, in this order: `certificateId`, `recipientName`, `recipientEmail`, `courseName`, `organizationName`, `issueDate`, `expiryDate`. It then takes the SHA-256 digest of that string. Changing any of those fields changes the hash, so an altered record no longer matches.

**How the backend talks to the chain.** The `ethers.js` library (version 6) connects to Infura's Sepolia JSON-RPC endpoint. A wallet created for this project signs the transactions. Because the contract only accepts calls from its owner, this wallet must be the account that deployed it.

**Operations**
- **Issue:** `storeCertificate(id, hash)` records the hash and emits `CertificateIssued`.
- **Revoke:** `revokeCertificate(id)` sets the revoked flag and emits `CertificateRevoked`.
- **Verify:** the backend recomputes the hash and checks it against the hash stored in the database and the hash returned by the contract, and reads the revoked flag from the contract.

**Expiry** is not written to the chain. It is derived from the certificate's expiry date each time it is read.

**Transaction evidence.** Example issue transaction: `0xc07338359c2c2e3173283aca9d3506d4638b5b63c053ebe34a831aa26c1f7225` (https://sepolia.etherscan.io/tx/0xc07338359c2c2e3173283aca9d3506d4638b5b63c053ebe34a831aa26c1f7225). [FILL IN] the contract deployment transaction hash from Etherscan if you want to cite it as well.

**Simulation mode.** With no RPC URL, wallet key or contract address configured, the same hash is computed but the transaction hash is a mock value and nothing is written on-chain.

---

## 6. Smart Contract Design (Figures 7 and 8)

**Contract:** `CertificateRegistry`, file `contracts/CertificateRegistry.sol`. Solidity ^0.8.20, MIT licence.

**State**
- `owner : address` (the deployer)
- `totalCertificates : uint256`
- `certificates : mapping(string => Certificate)` (private)

**Struct `Certificate`:** `certificateId` (string), `dataHash` (bytes32), `issuedBy` (address), `issuedAt` (uint256), `isRevoked` (bool), `exists` (bool).

**Functions**

| Function | Access | Behavior |
|----------|--------|----------|
| `storeCertificate(certificateId, dataHash)` | Owner only | Reverts if the ID already exists. Stores the record, increments `totalCertificates`, emits `CertificateIssued`. |
| `revokeCertificate(certificateId)` | Owner only | Reverts if the ID does not exist or is already revoked. Sets `isRevoked`, emits `CertificateRevoked`. |
| `getCertificate(certificateId)` | Anyone (view) | Reverts if the ID does not exist. Returns the ID, hash, issuer, issue time and revoked flag. |
| `certificateExistsOnChain(certificateId)` | Anyone (view) | Returns whether the ID is stored. |
| `verifyCertificate(certificateId, dataHash)` | Anyone (view) | Reverts if the ID does not exist. Returns true only if the hash matches and the certificate is not revoked. |

**Events:** `CertificateIssued(certificateId indexed, dataHash, issuedBy indexed, issuedAt)` and `CertificateRevoked(certificateId indexed, revokedAt)`.

**Modifiers:** `onlyOwner`, `certificateExists`, `certificateNotRevoked`.

**Design decisions**
- Only a hash is stored, which keeps personal data off a public chain and keeps gas costs low.
- A single owner controls writes, so only the issuing organization's backend can add or revoke certificates.
- A revocation cannot be undone, so a revoked certificate stays revoked.

**Status lifecycle (Figure 8).** A certificate starts Active. It becomes Expired when its expiry date passes, and either state can be Revoked by the owner. Revoked is final. A certificate with no expiry date stays Active until it is revoked.

---

## 7. User Interface Design

The interface is a set of plain HTML pages with one stylesheet and one script per page. It uses a light theme (cream background, white cards, thin borders) with Smalt Blue `#577E89` for links, Harvest Gold `#E1A36F` for the primary button and dark teal `#1F2E33` for text. Status colors (green, amber, red) are separate from the brand colors. The font is the system font stack. The layout adapts to narrow screens: the sidebar is hidden and multi-column areas stack.

**Pages**
- **Home:** one-line description, buttons to verify or log in, a box for entering a certificate ID, an illustration, and a four-step explanation.
- **Verify (public):** title band, certificate ID field with a Scan QR Code button, a result card, and side panels explaining what is checked, what each result means, and where to find the ID.
- **Login:** email and password form.
- **Dashboard:** total with a status bar, blockchain panel (network, contract, count recorded on-chain), activity timeline, and certificates expiring in the next 30 days.
- **Issue certificate:** three numbered sections (recipient, course, dates), a live certificate preview, and a result screen with the ID, transaction hash and download button.
- **All certificates:** search box, status filters with counts, table with ID, dates and status, and View, PDF and Revoke buttons.

**Screenshots to include** (take them from the running app at a normal desktop width):
1. Home page
2. Login page
3. Dashboard
4. Issue certificate form (with the preview filled in)
5. Issue result screen (certificate ID and transaction hash)
6. All certificates list
7. Certificate details window (opened with View)
8. Verify page with a Valid result (showing the transaction hash and Etherscan button)
9. Verify page with a Revoked result
10. The generated PDF certificate
11. The Etherscan page for the issue transaction
12. The email received by the recipient

---

## 8. Implementation Summary

**Technology stack**

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript (no framework); jsQR for camera QR scanning |
| Backend | Node.js 18+, Express 4 |
| Database | MongoDB Atlas, Mongoose 8 |
| Authentication | jsonwebtoken (24 hour tokens), bcryptjs (12 rounds) |
| Blockchain | Solidity ^0.8.20, ethers.js 6, Infura, Ethereum Sepolia, Remix IDE, MetaMask |
| PDF and QR | PDFKit, qrcode |
| Email | Nodemailer (SMTP) |

**Requirements coverage**

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Organization login | Done | JWT login, protected routes |
| Create and issue certificates | Done | Issue form and `POST /api/certificates/issue` |
| Downloadable PDF certificates | Done | PDFKit with QR code, fetched with the Bearer token |
| Record on the blockchain | Done | `storeCertificate` on Sepolia |
| View issued certificates | Done | Searchable, filterable list and dashboard |
| Verify by ID or QR code | Done | Public verify page, camera scan with jsQR |
| View certificate information | Done | Result card |
| View blockchain transaction information | Done | Transaction hash, network, Etherscan link |
| Status Valid, Expired, Revoked | Done | Computed on every verification |
| Blockchain integration for verification | Done | Hash compared with the contract's record |
| Email notification | Done | Nodemailer with PDF attached |
| Expiration management | Done | Expiry date, expired status, expiring-soon list |
| Revocation | Done | Contract call plus database update |

**API endpoints**

| Method and path | Access | Purpose |
|-----------------|--------|---------|
| POST /api/auth/login | Public | Log in, returns a JWT |
| GET /api/auth/me | JWT | Current user |
| POST /api/certificates/issue | JWT | Issue a certificate |
| GET /api/certificates | JWT | List with optional `status` and `search` |
| GET /api/certificates/stats | JWT | Totals by status |
| GET /api/certificates/chain-info | JWT | Network, contract, on-chain count |
| GET /api/certificates/:id | JWT | One certificate |
| GET /api/certificates/:id/pdf | JWT | Download the PDF |
| PATCH /api/certificates/:id/revoke | JWT | Revoke |
| GET /api/verify/:certificateId | Public | Verify a certificate |
| GET /api/health | Public | Health and mode |

**How to run**
1. `cd backend` then `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`. To use the live blockchain also set `ETHEREUM_RPC_URL`, `DEPLOYER_PRIVATE_KEY` and `CONTRACT_ADDRESS`. To send email set `EMAIL_USER` and `EMAIL_PASS` (a Gmail app password).
3. `node scripts/seed.js` creates the default organization account.
4. `npm start`, then open http://localhost:5000.

**Testing performed.** The application was tested manually end to end against the live Sepolia contract: login, issuing a certificate, PDF download, email delivery, verifying a valid certificate, revoking it, and verifying it again as revoked. No automated test suite is included.

**Limitations**
- The project runs on a test network, so the certificates have no real-world standing.
- There is a single organization role and no self-service sign-up page. Accounts are created with a script.
- Expiry is calculated from the stored date and is not recorded on the chain.
- The certificate description is not part of the hash.
- The cross-origin setting of the API is open, which is acceptable for a local project but should be restricted when deployed.

---

## 9. Public GitHub Repository Link

[FILL IN] https://github.com/<your-username>/<your-repository>

(The repository must be public. It should contain the `backend/`, `frontend/`, `contracts/` and `docs/` folders and the README. It must not contain `.env` or `node_modules/`.)

---

## 10. Individual Contribution Report

**Student:** [FILL IN name], [FILL IN student ID]
**Team type:** Individual (1 student). All design, development, testing and documentation were done by the sole author.

| Area | Work done |
|------|-----------|
| Smart contract | Designed and wrote `CertificateRegistry.sol`; deployed it to Sepolia with Remix and MetaMask |
| Blockchain service | `services/blockchain.js`: hashing, store, revoke, verify, chain information, simulation fallback |
| Backend API | Express server, authentication, certificate routes, verification route, JWT middleware, seed scripts |
| Database | Mongoose models for users and certificates |
| PDF and QR | `services/pdf.js` with the certificate layout and QR code |
| Email | `services/email.js` with the PDF attachment |
| Frontend | All pages, the stylesheet, the camera QR scanner, the dashboard, the live preview, the illustrations and the logo |
| Diagrams | Architecture, flow, sequence, ER, blockchain, contract and status diagrams |
| Testing | Manual end-to-end testing against the live Sepolia contract |
| Documentation | All sections of this report |

**Work division:** 100% by the author.

**GitHub history:** all commits were made from the author's own GitHub account. Repository: [FILL IN].

**Declaration.** I confirm that I carried out all of the technical work on this project and that I understand every part of the implemented solution and can explain it.

Name: [FILL IN]   Signature: ____________   Date: ________

---

## 11. Public Demo Video Link

[FILL IN] link to a public video (Google Drive with "Anyone with the link" access, or an unlisted YouTube video).

**Suggested demo script (about 5 to 6 minutes)**
1. Introduce the problem and the project (20 seconds).
2. Open the home page, then the login page, and log in.
3. Show the dashboard: totals, the blockchain panel with the contract address, the activity timeline.
4. Issue a certificate: fill in the form, point out the live preview, submit, and wait for the Sepolia transaction. Show the certificate ID and transaction hash.
5. Download the PDF and point out the QR code and the transaction hash on it.
6. Open the recipient's inbox and show the email with the PDF attached.
7. Open Etherscan from the verify page and show the real transaction and the contract.
8. Open the public verify page (a private window, not logged in), verify the certificate by ID and show the Valid result. Optionally scan the QR code with a phone.
9. Back in the organization view, revoke the certificate. Show the revoke transaction on Etherscan.
10. Verify the same certificate again and show the Revoked result.
11. Show the GitHub repository and the folder structure, then close with a short summary.

Before recording, run the whole flow once to make sure the wallet still has test ETH and the server is running in live mode (the console shows `Mode: Ethereum Sepolia`).
