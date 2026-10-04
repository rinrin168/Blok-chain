# System Architecture

## Architecture Style
The system follows a **3-Tier Web Application Architecture** with a blockchain integration layer:

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT LAYER (Tier 1)                  │
│         Vanilla HTML / CSS / JavaScript (browser)        │
│   Login | Dashboard | Issue | Certificates | Verify      │
└────────────────────────┬────────────────────────────────┘
                         │ Served as static files + HTTP REST API (JSON)
                         │ - same Node.js/Express server, same origin
                         ▼
┌─────────────────────────────────────────────────────────┐
│               APPLICATION LAYER (Tier 2)                 │
│                Node.js + Express.js Server                │
│    Serves frontend static files AND the /api/* routes    │
│  ┌─────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │  Auth   │ │ Certificates │ │  Verification Routes   │ │
│  │ Routes  │ │   Routes     │ │                        │ │
│  └─────────┘ └──────────────┘ └───────────────────────┘ │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │  Blockchain │ │  Email   │ │    PDF + QR Service   │  │
│  │   Service   │ │ Service  │ │                       │  │
│  └─────────────┘ └──────────┘ └──────────────────────┘  │
└───────────┬──────────────────────────────────────────────┘
            │
    ┌───────┴────────┐
    ▼                ▼
┌─────────┐   ┌──────────────────────────────────────────┐
│ MongoDB │   │         BLOCKCHAIN LAYER (Tier 3)         │
│(Database│   │   Ethereum Sepolia Testnet (via ethers.js)│
│  Tier 3)│   │   Smart Contract: CertificateRegistry     │
└─────────┘   └──────────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend (Presentation Layer)
| File | Role |
|------|------|
| `index.html` | Landing page with quick verify |
| `login.html` | Organization login page |
| `dashboard.html` | Admin dashboard with stats |
| `issue.html` | Certificate issuance form |
| `certificates.html` | List of all issued certificates |
| `verify.html` | Public certificate verification |
| `css/style.css` | Global design system |
| `js/*.js` | Page-specific logic |

### Backend (Application Layer)
| Module | Role |
|--------|------|
| `server.js` | Entry point, middleware setup, route mounting, serves `../frontend` as static files |
| `routes/auth.js` | POST /api/auth/login, GET /api/auth/me |
| `routes/certificates.js` | CRUD for certificates, issue, revoke |
| `routes/verify.js` | Public verification endpoint |
| `models/User.js` | Mongoose schema for organization accounts |
| `models/Certificate.js` | Mongoose schema for certificates |
| `middleware/auth.js` | JWT validation middleware |
| `services/blockchain.js` | Ethers.js - deploy, store, verify hash |
| `services/email.js` | Nodemailer - send certificate email |
| `services/pdf.js` | PDFKit + QRCode - generate certificate PDF |

### Database (Data Layer - MongoDB)
- **Users Collection**: Organization credentials, name, email
- **Certificates Collection**: Full certificate data + blockchain tx hash + status

### Blockchain Layer
- **Network**: Ethereum Sepolia Testnet
- **Smart Contract**: `CertificateRegistry.sol`
- **Interaction**: ethers.js library via a funded deployer wallet (private key in `.env`)

---

## Data Flow - Issuing a Certificate

```
Org User (Browser)
      │
      │ POST /api/certificates/issue
      ▼
Express API Server
      │
      ├── 1. Validate JWT token
      ├── 2. Generate unique Certificate ID (UUID)
      ├── 3. Hash certificate data (SHA-256)
      ├── 4. Store hash on Ethereum blockchain
      │         └── Returns tx hash
      ├── 5. Save certificate + tx hash to MongoDB
      ├── 6. Generate PDF with embedded QR code
      ├── 7. Send email to recipient
      └── 8. Return response to browser
```

## Data Flow - Verifying a Certificate

```
Public User (Browser)
      │
      │ GET /api/verify/:certificateId
      ▼
Express API Server
      │
      ├── 1. Fetch certificate record from MongoDB
      ├── 2. Query smart contract for stored hash
      ├── 3. Recompute hash from DB data
      ├── 4. Compare hashes → tamper detection
      ├── 5. Check expiry date
      └── 6. Return status: Valid / Expired / Revoked
```

---

## Security Architecture
| Concern | Mechanism |
|---------|-----------|
| API Authentication | JWT (JSON Web Tokens), 24h expiry |
| Password Storage | bcrypt hashing (salt rounds: 12) |
| Blockchain Wallet | Private key stored only in `.env` (never committed) |
| Data Integrity | SHA-256 hash stored on blockchain |
| CORS | Configured to allow only trusted origins |
