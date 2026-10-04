# Individual Contribution Report

## Student

| Field | Value |
|-------|-------|
| Name | [Your Name] |
| Student ID | [Your Student ID] |

**Team Type**: Individual (1 student)

---

## Contribution Summary

### Technical Work
| Area | Contributions |
|------|--------------|
| **Smart Contract** | Designed and wrote `CertificateRegistry.sol` in Solidity; implemented `storeCertificate`, `revokeCertificate`, `getCertificate`, `verifyCertificate` functions with access control and events |
| **Blockchain Service** | Implemented `services/blockchain.js` using ethers.js v6; handled contract deployment, hash storage, verification, and fallback simulation mode |
| **Backend: Auth** | Implemented `routes/auth.js` - login, JWT issuance, `GET /me` endpoint; `middleware/auth.js` for token validation |
| **Backend: Server Setup** | Set up `server.js` - Express configuration, middleware (CORS, body-parser), route mounting, error handling |
| **Backend: Certificates** | Built `routes/certificates.js` - issue, list, revoke, download PDF endpoints |
| **Backend: Verify** | Built `routes/verify.js` - public verification endpoint with hash comparison logic |
| **Email Service** | Implemented `services/email.js` using Nodemailer with PDF attachment and styled email body |
| **PDF + QR Service** | Implemented `services/pdf.js` using PDFKit and qrcode; styled the PDF certificate layout with QR code embedding |
| **Database Models** | Designed and implemented `models/User.js` and `models/Certificate.js` Mongoose schemas |
| **Backend: Seeding** | Wrote `scripts/seed.js` for default admin account |
| **Frontend: CSS Design** | Designed and wrote the entire `css/style.css` - layout, forms, tables, responsive rules |
| **Frontend: Landing Page** | Built `index.html` |
| **Frontend: Login Page** | Built `login.html` and `js/auth.js` - JWT-based login flow |
| **Frontend: Dashboard** | Built `dashboard.html` and `js/dashboard.js` - stat counters, recent certificates |
| **Frontend: Issue Page** | Built `issue.html` and `js/issue.js` - form validation, loading states, success display |
| **Frontend: Certificates Page** | Built `certificates.html` and `js/certificates.js` - sortable table, search, revoke action |
| **Frontend: Verify Page** | Built `verify.html` and `js/verify.js` - QR scan support, result display, Etherscan link |

### Non-Technical Work
| Area | Contributions |
|------|--------------|
| **Documentation** | Wrote all documentation files (`01_system_overview.md` through `08_implementation_summary.md`) |
| **Testing** | Manual end-to-end testing against the live Sepolia contract (issue, verify, revoke, email, PDF) |
| **Video Demo** | Recorded and edited the public demo video |

---

## Work Division

Individual project - 100% of design, development, testing, and documentation completed by the sole author listed above.

---

## GitHub Commit History

All commits were made under the author's own GitHub account.

**Repository Link**: *(Add your GitHub repository URL here)*

---

## Declaration

I declare that I have contributed all technical work on this project myself and am able to understand and explain every part of the implemented solution.

| Name | Signature | Date |
|------|-----------|------|
| [Your Name] | ____________ | ________ |
