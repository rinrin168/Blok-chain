# User Flow / System Flow

## User Roles
| Role | Description | Access |
|------|-------------|--------|
| **Organization Admin** | Staff of the issuing institution | Login required |
| **Public User** | Certificate recipient or verifier | No login required |

---

## Flow 1: Organization Login

```
[User visits login.html]
        │
        ▼
[Enters email + password]
        │
        ▼
[POST /api/auth/login]
        │
    ┌───┴───┐
  Valid?   No
    │       └── Show error: "Invalid credentials"
    ▼
[Receive JWT token]
        │
        ▼
[Store token in localStorage]
        │
        ▼
[Redirect to dashboard.html]
```

---

## Flow 2: Issuing a Certificate

```
[Admin on issue.html]
        │
        ▼
[Fill form: Recipient Name, Email, Course, Description,
           Issue Date, Expiry Date]
        │
        ▼
[Click "Issue Certificate"]
        │
        ▼
[POST /api/certificates/issue  (with JWT header)]
        │
        ▼
[Backend: Generate Certificate ID]
        │
        ▼
[Backend: SHA-256 hash of certificate data]
        │
        ▼
[Backend: Call smart contract → storeCertificate(id, hash)]
        │
        ▼
[Blockchain records tx → returns txHash]
        │
        ▼
[Backend: Save to MongoDB]
        │
        ├── [Generate PDF with QR code]
        │
        └── [Send email to recipient with PDF attachment]
        │
        ▼
[Frontend: Show success toast + Certificate ID]
        │
        ▼
[Admin can download PDF or view in certificates list]
```

---

## Flow 3: Viewing Issued Certificates

```
[Admin on certificates.html]
        │
        ▼
[GET /api/certificates  (with JWT header)]
        │
        ▼
[Backend: Fetch all certificates for this org]
        │
        ▼
[Frontend: Display table with Status badges]
        │
        ├── [Click "View Details"] → Show modal with full info + tx hash
        ├── [Click "Download PDF"] → GET /api/certificates/:id/pdf
        └── [Click "Revoke"] → PATCH /api/certificates/:id/revoke
                                    │
                                    ▼
                              [Smart contract: revokeCertificate(id)]
                                    │
                                    ▼
                              [MongoDB: status = "revoked"]
```

---

## Flow 4: Public Certificate Verification

```
[Public user visits verify.html]
        │
   ┌────┴────┐
   │         │
Type ID    Scan QR
   │         │
   └────┬────┘
        ▼
[GET /api/verify/:certificateId]
        │
        ▼
[Backend: Fetch from MongoDB]
        │
        ▼
[Backend: Call smart contract → getCertificate(id)]
        │
        ▼
[Backend: Recompute SHA-256 hash from DB data]
        │
        ▼
[Backend: Compare stored hash vs computed hash]
        │
    ┌───┴──────────────────────────┐
  Match?                         No Match
    │                               └── Status: "TAMPERED"
    ▼
[Check revocation status]
    │
    ├── Revoked? → Status: "REVOKED"
    ├── Expired? → Status: "EXPIRED"
    └── Active?  → Status: "VALID"
        │
        ▼
[Frontend: Display certificate details]
[Show: Recipient, Course, Issue Date, Expiry, Tx Hash, Etherscan link]
```

---

## Flow 5: Email Notification (Automated)

```
[Certificate issued successfully]
        │
        ▼
[Email Service triggered automatically]
        │
        ▼
[Nodemailer sends to recipient email]:
  - Subject: "Your Digital Certificate is Ready"
  - Body: Recipient name, course, certificate ID
  - Attachment: Generated PDF certificate
  - Verify link: https://<domain>/verify.html?id=<certId>
```

---

## System Flow Diagram (High Level)

```
┌──────────┐     Issue      ┌──────────────┐    Store Hash    ┌─────────────┐
│   Org    │ ─────────────► │   Backend    │ ───────────────► │  Ethereum   │
│  Admin   │                │  (Express)   │ ◄─────────────── │  Blockchain │
└──────────┘                │              │    tx Hash       └─────────────┘
                            │              │
                            │              │    Save Record   ┌─────────────┐
                            │              │ ───────────────► │   MongoDB   │
                            │              │ ◄─────────────── │  Database   │
                            │              │    Certificate   └─────────────┘
                            │              │
                            │              │    Send Email    ┌─────────────┐
                            │              │ ───────────────► │  Recipient  │
                            └──────────────┘                  └─────────────┘
                                   ▲
                            Verify │
                            ┌──────┴───────┐
                            │  Public User │
                            └──────────────┘
```
