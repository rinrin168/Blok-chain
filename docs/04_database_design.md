# Database Design (ER Diagram)

## Overview
The system uses **MongoDB** (NoSQL) with **Mongoose** ODM. Two primary collections store all application data.

---

## Collections

### Collection 1: `users`
Stores organization admin accounts.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto | MongoDB document ID |
| `organizationName` | String | Required | Name of the institution |
| `email` | String | Required, Unique | Login email |
| `password` | String | Required | bcrypt-hashed password |
| `role` | String | Default: "admin" | User role |
| `createdAt` | Date | Auto | Account creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

---

### Collection 2: `certificates`
Stores all issued certificate records.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto | MongoDB document ID |
| `certificateId` | String | Required, Unique | Public Certificate ID (UUID v4) |
| `recipientName` | String | Required | Full name of recipient |
| `recipientEmail` | String | Required | Email address for notification |
| `courseName` | String | Required | Name of course/program |
| `courseDescription` | String | Optional | Brief course description |
| `issuedBy` | ObjectId | FK → users._id | Reference to issuing organization |
| `organizationName` | String | Required | Denormalized org name |
| `issueDate` | Date | Required | Date of issue |
| `expiryDate` | Date | Optional | Certificate expiry date |
| `certificateHash` | String | Required | SHA-256 hash of certificate data |
| `blockchainTxHash` | String | Required | Ethereum transaction hash |
| `blockchainNetwork` | String | Default: "sepolia" | Network name |
| `status` | String | Enum | "active" / "expired" / "revoked" |
| `revokedAt` | Date | Nullable | Timestamp of revocation |
| `revokedReason` | String | Nullable | Reason for revocation |
| `pdfPath` | String | Optional | Server path to generated PDF |
| `createdAt` | Date | Auto | Record creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

---

## ER Diagram (Text Representation)

```
┌───────────────────────────┐          ┌───────────────────────────────────┐
│         USERS             │          │          CERTIFICATES              │
│───────────────────────────│          │───────────────────────────────────│
│ PK  _id          ObjectId │◄─────────│ FK  issuedBy         ObjectId     │
│     organizationName  Str │  1    N  │ PK  _id              ObjectId     │
│     email         String  │          │     certificateId    String (UUID) │
│     password      String  │          │     recipientName    String        │
│     role          String  │          │     recipientEmail   String        │
│     createdAt     Date    │          │     courseName       String        │
│     updatedAt     Date    │          │     courseDescription String       │
└───────────────────────────┘          │     organizationName String        │
                                       │     issueDate        Date          │
                                       │     expiryDate       Date          │
                                       │     certificateHash  String        │
                                       │     blockchainTxHash String        │
                                       │     blockchainNetwork String       │
                                       │     status           String        │
                                       │     revokedAt        Date          │
                                       │     revokedReason    String        │
                                       │     pdfPath          String        │
                                       │     createdAt        Date          │
                                       │     updatedAt        Date          │
                                       └───────────────────────────────────┘
```

**Relationship**: One `User` (organization) issues many `Certificates` (1:N)

---

## Indexes
| Collection | Field | Type | Purpose |
|-----------|-------|------|---------|
| `certificates` | `certificateId` | Unique | Fast lookup by public ID |
| `certificates` | `recipientEmail` | Non-unique | Query by recipient |
| `certificates` | `issuedBy` | Non-unique | Query by organization |
| `users` | `email` | Unique | Login lookup |

---

## Sample Certificate Document (JSON)
```json
{
  "_id": "64f3a1b2c3d4e5f6a7b8c9d0",
  "certificateId": "CERT-2024-A3F9B2C1",
  "recipientName": "Sok Dara",
  "recipientEmail": "sokdara@example.com",
  "courseName": "Full Stack Web Development",
  "courseDescription": "A 6-month intensive bootcamp covering Node.js, React, and MongoDB.",
  "issuedBy": "64f3a1b2c3d4e5f6a7b8c9d1",
  "organizationName": "Cambodia Institute of Technology",
  "issueDate": "2024-06-15T00:00:00.000Z",
  "expiryDate": "2027-06-15T00:00:00.000Z",
  "certificateHash": "a3f9b2c18e4d7f0123456789abcdef...",
  "blockchainTxHash": "0xabc123def456...",
  "blockchainNetwork": "sepolia",
  "status": "active",
  "revokedAt": null,
  "revokedReason": null,
  "pdfPath": "./pdfs/CERT-2024-A3F9B2C1.pdf",
  "createdAt": "2024-06-15T08:30:00.000Z",
  "updatedAt": "2024-06-15T08:30:00.000Z"
}
```
