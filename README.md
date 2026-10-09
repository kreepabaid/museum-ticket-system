# Museum and Exhibition Ticket Booking System

A production-grade, Serverless AWS Cloud Application for Museum and Exhibition Ticketing with an immediate, zero-configuration local demonstration mode.

---

## 🌟 Key Features (All 20 Implemented)

1. **Visitor Registration**: Bcrypt-hashed password storage, JWT session token generation, hardcoded `VISITOR` role to prevent privilege escalation.
2. **Exhibition Registration**: Admin management form to publish new exhibitions (category, hall location, dates, high-res curation).
3. **Exhibition Details**: Interactive showcase with descriptions, curatorial highlights, and category filters.
4. **Exhibition Schedule**: Slot creation with customizable start/end time windows and allocated capacity.
5. **Ticket Availability**: Live capacity monitoring with gauges, progress bars, and status badges (`Available`, `Filling Fast` >= 80%, `Sold Out`).
6. **Online Ticket Booking**: Streamlined reservation with party size selector (1–10 visitors), price calculation, and confirmation receipt.
7. **Date & Time Selection**: Date picker strip with interactive schedule time slots.
8. **Visitor Capacity Management**: Enforced via atomic DynamoDB `TransactWriteItems` with condition `bookedCount + :val <= capacity`. Overbooking rejected with HTTP 409.
9. **Digital Ticket Generation**: Printable gold-accented admission pass with booking references and admit counts.
10. **Cryptographic QR-Code Ticket**: QR payload signed with HMAC-SHA256 (`bookingId.signature`) and verified using `crypto.timingSafeEqual` to prevent forgery.
11. **Gate Ticket Validation**: Dedicated entrance scanner console with instant audio-visual admission feedback, rejecting duplicate or cancelled scans with HTTP 409/400.
12. **Ticket Cancellation**: Self-service cancellation modal in visitor portal that atomically restores capacity to the schedule.
13. **Visitor History**: Tabbed history view (`Active`, `Admitted`, `Cancelled`) with digital pass re-downloads.
14. **Exhibition-Wise Booking Statistics**: Detailed attendance breakdown, capacity utilization rate, and visitor counts per exhibition.
15. **Daily Visitor Count**: Multi-day historical trend comparing bookings created vs. visitors admitted at gates.
16. **Admin Dashboard**: Executive command center with real-time KPIs, utilization gauge, and quick actions.
17. **Live Gate Entry Monitoring**: Near real-time polling feed displaying scanned tickets, visitor names, and admission timestamps.
18. **Amazon SNS Notifications**: Publishes confirmation and cancellation alerts with real-time in-app toast notifications.
19. **Booking Confirmation**: Rich receipt card displaying booking reference, time window, admitted count, and ticket pass link.
20. **Reports & Analytics**: Executive analytics summary with attendance and cancellation rates, printable report, and CSV export.

---

## ☁️ AWS Cloud Architecture

* **Frontend Hosting**: React (Vite) stored in a **Private S3 Bucket** and distributed globally via **CloudFront Origin Access Control (OAC)**. Direct S3 access is blocked.
* **API Routing**: **Amazon API Gateway** routing to discrete Node.js 20.x Lambda functions.
* **Compute**: **AWS Lambda** handlers with least-privilege IAM roles scoped per function (`serverless-iam-roles-per-function`).
* **Database**: **Amazon DynamoDB** (On-Demand billing mode):
  * `Museum_Users` (PK `userId`, GSI `email-index`)
  * `Museum_Exhibitions` (PK `exhibitionId`)
  * `Museum_Schedules` (PK `exhibitionId`, SK `dateSlot`)
  * `Museum_Bookings` (PK `bookingId`, GSI `VisitorHistoryIndex`)
  * `Museum_EntryRecords` (PK `entryId`, GSI `date-index`)
  * `Museum_Statistics` (PK `statKey`)
* **Notifications**: **Amazon SNS** topic (`MuseumNotifications_dev`).

---

## 🚀 Instant Local Demonstration (Zero-Config)

You do **NOT** need an active AWS credit card or cloud credentials to run and evaluate this project locally!

### 1-Click Launch (Windows)
Double-click `start-all.bat` or run:
```bash
npm run dev
```

### Manual Launch
1. **Backend**:
   ```bash
   cd backend
   npm run dev
   ```
   *Runs on `http://localhost:3000` with pre-seeded exhibitions, schedules, bookings, and demo accounts.*

2. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs on `http://localhost:5173`.*

---

## 🔑 Demo Evaluation Accounts

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Curator Admin** | `admin@museum.org` | `Admin@123` | Access Admin Dashboard, Gate Scanner, Reports, Exhibition Creation |
| **Demo Visitor** | `visitor@example.com` | `Visitor@123` | Book tickets, view digital QR pass, test cancellation |

*Note: The frontend includes 1-Click Demo Login buttons in the navigation bar and modals so evaluators can switch between roles instantly without typing credentials.*

---

## 🧪 Verification & Automated Tests

To run the automated backend test suite covering all Stage 1 through Stage 5 test gates:
```bash
cd backend
npm test
```
*Tests cover:*
* Seeded exhibition retrieval
* Visitor registration & duplicate email rejection (409)
* Admin role guard (403 for visitors on `/admin/*`)
* Atomic booking capacity checks (overbooking rejected with 409)
* Atomic cancellation and capacity restoration
* Gate ticket validation, duplicate scan prevention (409), and HMAC signature verification
* Admin dashboard KPIs, exhibition stats, and daily visitor counts

---

## ☁️ Deploying to AWS

When ready to deploy to your AWS account:
1. Configure credentials:
   ```bash
   aws configure
   ```
2. Deploy backend:
   ```bash
   cd backend
   serverless deploy
   ```
3. Set your API Gateway endpoint in `frontend/.env`:
   ```env
   VITE_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/dev
   ```
4. Build and deploy frontend:
   ```bash
   cd frontend
   npm run build
   aws s3 sync dist/ s3://museum-ticket-frontend-dev-<account-id>
   ```
