# Calibre HR — Enterprise Employee Management System

Calibre HR is a full-stack, security-first Enterprise Employee Management System built with React, TypeScript, Tailwind CSS, Framer Motion (`motion`), Recharts, Node.js, Express, and MongoDB (Mongoose).

## Core Capabilities

- **Animated HR Overview Dashboard**: Real-time MongoDB-backed KPIs, monthly employee growth and hiring charts, department distribution, attendance analytics, status breakdown, upcoming birthdays, and pending leave queues.
- **Employee Directory & Profiles**: Complete CRUD, duplicate Employee ID / Email enforcement, live search, sorting, filtering, pagination, bulk status actions, CSV export, magic-byte-verified profile photo uploads, and role-restricted compensation/personal views.
- **Departments & Designations**: Full management with relational employee count tracking and deletion safeguards when staff are assigned.
- **Attendance Management**: Daily check-in/out dashboard, self check-in for employees, monthly attendance summary report, and creator/modifier audit tracking.
- **Leave Management**: Leave balances, overlap detection, business-day calculation, approval/rejection workflow with manager comments, employee cancellation, and approved leave calendar.
- **Configurable Payroll**: Gross/Net calculation (`Gross = Basic + Allowances + Bonus`, `Net = Gross - Deductions`), batch monthly draft generation, approval/payment workflow, client-side PDF payslip export, and strict HR/Super Admin access enforcement.
- **Performance Management**: Confidential performance reviews, rating history, goal completion tracking, and employee acknowledgment.
- **Security & RBAC**: 4 server-enforced roles (`SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`), JWT short-lived access tokens + HttpOnly/SameSite=None/Partitioned refresh token rotation, bcrypt password hashing, account lockout, Helmet, CORS allowlist, rate limiting, NoSQL key sanitization, Zod validation, and Audit Logs.

## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (copy `.env.example` to `.env`):
   - `MONGODB_URI`: Optional MongoDB connection string. When omitted in development, Calibre HR boots a persistent local MongoDB instance under `.data/mongodb`.
   - `APP_URL` / `CORS_ORIGIN`: Allowed frontend origins.
   - `PORT`: Server port (defaults to `3000`).
3. Start development server:
   ```bash
   npm run dev
   ```
4. First-run setup:
   Open `http://localhost:3000` and claim your **Super Admin** account via the initial setup form (optionally populating enterprise departments, staff, attendance, and payroll data).

## Verification & Testing

- Type check: `npm run lint`
- Unit & API integration tests: `npm test`
- Production build: `npm run build`
- Production start: `npm start`
