# 🎓 CampusConnect – College Event & Room Booking System

> A modern, real-world campus management platform built with **Node.js, Express, MongoDB, EJS, Tailwind CSS, Redis, Socket.IO, Nodemailer, and Node-Cron**. Engineered with role-based access control (RBAC), slot conflict detection, QR-code event passes, real-time sync, and automated background jobs.

---

## 🚀 Key Features & Highlights

### 1. 🔐 Authentication & Role-Based Access Control (RBAC)
- **Three Dedicated Roles:**
  - **Admin:** Full command center, manage rooms, approve/reject venue requests, system audit logs, metrics dashboard.
  - **Faculty / Organizer:** Host college events, book halls with auto-approval, view attendee rosters, live door check-ins.
  - **Student:** Browse venues, check slot availability, submit booking requests, claim event tickets with QR codes.
- Password hashing with **Bcrypt.js** (10 salt rounds).
- Stateless JWT stored securely in `httpOnly` cookies with session flash messaging.
- Rate limiting on authentication routes to prevent brute-force attacks.

### 2. 🏛️ Smart Campus Venue & Room Booking
- Multi-parameter venue catalog filtered by **Building, Venue Type, and Seating Capacity**.
- **Conflict-Free Slot Engine:** Algorithmically prevents double bookings by verifying time intervals `(start1 < end2 && end1 > start2)`.
- Interactive visual time-slot matrix showing live slot availability for any selected date.
- Real-time room status updates via **Socket.IO** (slots lock instantly on connected clients without page reload).

### 3. 🎟️ Event Management & QR Code Pass Generation
- College event creation with automated venue reservation linking.
- Category filters (Technical, Cultural, Sports, Workshop, Hackathon, Seminar, Career).
- Live attendee RSVP counters synced in real time across active clients.
- Automated generation of unique **QR Code Event Tickets** (`qrcode` library) sent via email and viewable in student pass wallet.
- Door check-in roster with 1-click attendance toggle for organizers.

### 4. ⚡ Real-Time WebSockets (Socket.IO)
- Instant room schedule updates when a slot is reserved or released.
- Live personal notification toasts (e.g., when an admin approves or rejects your booking).
- Live attendee count increments on event pages.

### 5. ⏱️ Automated Background Jobs (Node-Cron)
- **Lifecycle Sweeper (Every 15 mins):** Automatically completes elapsed bookings and cancels expired pending requests.
- **Event Reminders (Daily at 8:00 AM):** Scans for events occurring the following day and dispatches reminder emails to registered attendees.
- Graceful shutdown and cache eviction routines.

### 6. 🚀 High-Performance Caching (Redis + Memory Fallback)
- Caching layer for venue lists, event catalogs, and dashboard metrics with intelligent TTL.
- **Resilient Fallback:** If a Redis server is not running locally, the system automatically falls back to an in-memory TTL cache—meaning zero crashes during local development!

### 7. 📧 Automated Email Notifications (Nodemailer)
- Responsive, styled HTML email templates for:
  - Account welcome
  - Room booking status updates (Approved / Rejected)
  - Event registration confirmation with embedded ticket QR code
  - 24-hour event reminders
- Automatically leverages **Ethereal Email** test accounts if custom SMTP credentials are not configured.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, EJS (Embedded JavaScript), Tailwind CSS, FontAwesome |
| **Backend** | Node.js (v18+), Express.js |
| **Database** | MongoDB & Mongoose ODM |
| **Authentication** | JSON Web Tokens (JWT), Bcrypt.js, Cookie-Parser |
| **Real-Time** | Socket.IO |
| **Caching** | Redis (`ioredis`) with seamless In-Memory fallback |
| **Scheduled Tasks** | Node-Cron |
| **Emails** | Nodemailer (HTML templates + Ethereal/SMTP) |
| **QR Code Engine** | Node QRCode |
| **Deployment** | Railway (Backend + Cron + WebSockets), Vercel (Frontend/Serverless) |

---

## 📂 Project Directory Structure

```
CCA Project/
├── api/
│   └── index.js              # Vercel serverless entry point
├── config/
│   ├── db.js                 # MongoDB connection
│   ├── redis.js              # Redis client with in-memory fallback
│   ├── mailer.js             # Nodemailer configuration
│   └── socket.js             # Socket.IO setup and event emitters
├── controllers/
│   ├── authController.js     # Auth, registration, profile & logout
│   ├── roomController.js     # Room catalog, CRUD & availability
│   ├── bookingController.js  # Booking requests, approval & cancellation
│   ├── eventController.js    # Events, RSVP, QR ticketing & roster
│   ├── dashboardController.js# Role-based dashboards (Admin/Faculty/Student)
│   └── apiController.js      # AJAX endpoints & system health
├── middleware/
│   ├── authMiddleware.js     # JWT verification & RBAC enforcement
│   ├── errorHandler.js       # 404 & 500 error handlers
│   └── rateLimiter.js        # Express rate limiting
├── models/
│   ├── User.js               # User model with bcrypt pre-save hook
│   ├── Room.js               # Campus room / venue schema
│   ├── Booking.js            # Room reservation schema with compound indexes
│   ├── Event.js              # College event schema
│   ├── Registration.js       # Event ticket RSVP & QR data
│   ├── Notification.js       # In-app notifications
│   └── AuditLog.js           # Security and administrative audit trail
├── public/
│   ├── css/
│   │   └── style.css         # Custom animations & glassmorphism
│   └── js/
│       └── main.js           # Socket.IO client, toast alerts & dropdowns
├── routes/
│   ├── authRoutes.js
│   ├── roomRoutes.js
│   ├── bookingRoutes.js
│   ├── eventRoutes.js
│   ├── dashboardRoutes.js
│   └── apiRoutes.js
├── scripts/
│   └── seed.js               # Rich database seed script
├── services/
│   ├── cronService.js        # Node-cron background jobs
│   └── emailTemplates.js     # Styled responsive HTML email templates
├── views/
│   ├── partials/             # Header, Navbar, Footer, Alerts
│   ├── auth/                 # Login, Register, Profile
│   ├── rooms/                # Index, Show (Slot picker), Create
│   ├── bookings/             # My Bookings, Manage Bookings
│   ├── events/               # Index, Show, Create, My Tickets, Attendees
│   ├── dashboard/            # Admin, Faculty, Student dashboards
│   ├── index.ejs             # Main Landing Page
│   ├── 404.ejs
│   └── 500.ejs
├── .env.example
├── .gitignore
├── Procfile                  # Railway deployment process file
├── railway.json              # Railway deployment config
├── vercel.json               # Vercel serverless routing
├── package.json
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **MongoDB:** Local MongoDB instance running on `mongodb://127.0.0.1:27017` or a free **MongoDB Atlas** cluster URI.
- **Redis (Optional):** If Redis is not installed, the app automatically runs in fallback in-memory cache mode without any configuration.

### 2. Clone and Install Dependencies
```bash
cd "c:\Users\pardh\OneDrive\Documents\Desktop\CCA Project"
npm install
```

### 3. Environment Variables Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000
MONGODB_URI=mongodb://127.0.0.1:27017/campusconnect
JWT_SECRET=campusconnect_super_secret_jwt_key_2026_secure
SESSION_SECRET=campusconnect_super_session_secret_key_2026
REDIS_URL=redis://127.0.0.1:6379
CRON_ENABLED=true
```

### 4. Seed the Database
Populate the database with realistic sample venues, upcoming events, and test accounts:
```bash
npm run seed
```

### 5. Start the Application
```bash
# Start in standard mode:
npm start

# Or with auto-reload (Node.js 18+ watch mode):
npm run dev
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@campus.edu` | `admin123` | Full dashboard, add/edit venues, approve/reject bookings, audit logs |
| **👨‍🏫 Faculty** | `faculty@campus.edu` | `faculty123` | Host events, auto-approved room bookings, attendee rosters & check-in |
| **🎓 Student** | `student@campus.edu` | `student123` | RSVP for events, get QR passes, request study/lab room bookings |

> 💡 **Tip:** The login page features **1-Click Demo Login** buttons to sign in as any role instantly!

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System health, MongoDB state, uptime & cache status | No |
| `GET` | `/api/rooms/:id/availability?date=YYYY-MM-DD` | Returns occupied and free time slots | No |
| `GET` | `/api/notifications` | Fetch unread notifications for current user | Yes |
| `POST`| `/api/notifications/:id/read` | Mark a notification as read | Yes |
| `POST`| `/bookings/book` | Submit room reservation request | Yes |
| `POST`| `/bookings/:id/status` | Approve or reject room booking | Admin / Faculty |
| `POST`| `/events/:id/register` | RSVP for an event and generate QR ticket | Yes |
| `POST`| `/events/attendees/:id/checkin` | Toggle event door check-in | Organizer / Admin |

---

## 🚢 Production Deployment Guide

### Option 1: Railway Backend Deployment (Recommended for Socket.IO & Node-Cron)
Railway provides full support for long-running Node.js processes, WebSockets, background Cron jobs, and managed Redis/MongoDB.

1. Create an account on [Railway.app](https://railway.app).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Select this repository.
4. Add environment variables in the Railway dashboard:
   - `NODE_ENV=production`
   - `MONGODB_URI=<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET=<A secure random 64-char string>`
   - `SESSION_SECRET=<A secure random string>`
   - `REDIS_URL=<Railway Redis Plugin URL or leave blank for memory fallback>`
   - `SMTP_USER` & `SMTP_PASS` (Optional, for production emails like SendGrid or Gmail App Password)
5. Railway will automatically detect the included `Procfile` and `railway.json`, build with Nixpacks, and deploy the application.
6. The `/api/health` endpoint will automatically serve as the healthcheck probe.

### Option 2: Vercel Deployment
1. Import the repository into [Vercel](https://vercel.com).
2. Vercel will detect `vercel.json` and route all requests through `api/index.js`.
3. Add your `MONGODB_URI`, `JWT_SECRET`, and other environment variables in **Project Settings &rarr; Environment Variables**.
4. Click **Deploy**.
> *Note:* Vercel functions are serverless. For persistent WebSockets and background cron tasks running 24/7, deploy the main server to Railway and point frontend requests to it, or use Vercel Cron.

---

## 🛡️ Git & GitHub Setup

Initialize and push to GitHub:
```bash
git init
git add .
git commit -m "feat: complete CampusConnect college event and room booking system"
git branch -M main
git remote add origin https://github.com/<your-username>/campusconnect.git
git push -u origin main
```

---

## 📄 License
This project is licensed under the ISC License. Designed for universities, colleges, and academic institutions.
