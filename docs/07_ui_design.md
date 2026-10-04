# User Interface Design

## Approach
The interface is a small set of plain HTML pages styled by one stylesheet (`frontend/css/style.css`) and driven by one script per page. The goal was readable forms and tables, with no effects that get in the way of the content.

- **Theme**: light. Cream page background, white cards, thin borders, no shadows or gradients.
- **Colors**: Smalt Blue `#577E89` for links and highlights, Harvest Gold `#E1A36F` for the primary button, dark teal `#1F2E33` for text. Status colors (green, amber, red) are kept separate from the brand colors so a certificate's state is always clear.
- **Typography**: the system font stack (`Segoe UI`, then the platform default).
- **Layout**: a sidebar and content area for the organization pages, a single column for the public pages. The sidebar is hidden below 768px.

## Pages

### Home (`index.html`)
Short description of the system, a "Verify a certificate" and an "Organization login" button, a box to type a certificate ID, and a four-step explanation of how it works.

### Login (`login.html`)
Email and password form. Errors appear above the button. The demo account is listed under the form for local testing.

### Dashboard (`dashboard.html`)
Four counters (total, active, expired, revoked), shortcut buttons, and a table of the five most recent certificates.

### Issue certificate (`issue.html`)
Form with recipient name, recipient email, course name, optional description, issue date and optional expiry date. After submission the page shows the certificate ID, the transaction hash, the network, and buttons to copy the ID or download the PDF.

### All certificates (`certificates.html`)
Searchable table with status filter tabs (all, active, expired, revoked). Each row has View, PDF and Revoke buttons. View opens a modal with the full record and the transaction hash.

### Verify (`verify.html`)
Public page. The user enters a certificate ID or scans the QR code with the camera. The result card shows the status banner (valid, expired or revoked), the certificate fields, whether the hash matches the on-chain record, the transaction hash, and a link to Etherscan.

## Certificate PDF
A4 landscape. A cream card with a gold frame and two Smalt Blue corner blocks. It shows the recipient name, the course, the issue and expiry dates, the certificate ID, the status and network, the organization name, a QR code that opens the verify page, and the transaction hash along the bottom edge.

## Color tokens

| Token | Value | Use |
|-------|-------|-----|
| `--bg-primary` | `#fbf9f2` | Page background |
| `--bg-card` | `#ffffff` | Cards, tables, forms |
| `--border` | `#d9d2b4` | Borders and dividers |
| `--accent-blue` | `#577e89` | Links, highlights |
| `--accent-gold` | `#e1a36f` | Primary button |
| `--text-primary` | `#1f2e33` | Body text |
| `--text-muted` | `#55696f` | Secondary text |
| `--success` | `#2f7d4f` | Valid |
| `--warning` | `#a66a12` | Expired |
| `--danger` | `#b3382c` | Revoked, errors |

## Responsive behavior

| Width | Change |
|-------|--------|
| Under 768px | Sidebar hidden, forms and detail grids become one column, counters two per row |
| Under 480px | Counters one per row, tighter card padding |

## Screenshots
Add screenshots of the running application here before submitting: home, login, dashboard, issue (form and result), certificates list, verify (valid and revoked), and the generated PDF.
