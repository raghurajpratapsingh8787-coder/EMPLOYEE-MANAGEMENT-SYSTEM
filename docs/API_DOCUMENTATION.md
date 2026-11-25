# API Documentation

All endpoints are served under `/api` and enforce JSON request/response bodies with Zod schema validation and server-side RBAC.

## Authentication (`/api/auth`)

- `GET /api/auth/bootstrap-status` — Returns `{ needsSetup: boolean }`.
- `POST /api/auth/setup` — One-time Super Admin bootstrap and optional sample data seeding. Locks permanently once any user exists.
- `POST /api/auth/login` — Authenticates email/password, returns short-lived Bearer access token and sets HttpOnly refresh cookie.
- `POST /api/auth/refresh` — Rotates refresh session cookie and issues a fresh access token.
- `POST /api/auth/logout` — Revokes active session in MongoDB and clears refresh cookie.
- `POST /api/auth/forgot-password` — Generates time-limited password reset token hash.
- `POST /api/auth/reset-password` — Resets password and revokes prior sessions.
- `GET /api/auth/me` — Returns authenticated user and linked employee profile.
- `PUT /api/auth/profile` — Updates own contact info or password (role escalation forbidden).

## Employees (`/api/employees`)

- `GET /api/employees` — Paginated directory with `search`, `departmentId`, `status`, `employmentType`, `sortBy`, `sortOrder`. Salary stripped for non-HR roles.
- `GET /api/employees/export` — CSV export (`SUPER_ADMIN`, `HR_ADMIN`) with formula injection neutralization.
- `POST /api/employees` — Create employee (`SUPER_ADMIN`, `HR_ADMIN`). Enforces unique `employeeId` and `email`.
- `GET /api/employees/:id` — Detailed employee profile with role-scoped tabs.
- `PUT /api/employees/:id` — Update employee (`SUPER_ADMIN`, `HR_ADMIN`).
- `DELETE /api/employees/:id` — Delete employee (`SUPER_ADMIN`, `HR_ADMIN`).
- `POST /api/employees/bulk-status` — Bulk status update (`SUPER_ADMIN`, `HR_ADMIN`).
- `POST /api/employees/:id/avatar` — Upload profile image (2 MB max, JPEG/PNG/WEBP magic-byte validated).

## Organization (`/api/organization`)

- `GET/POST/PUT/DELETE /api/organization/departments` — Department management (deletion blocked if employees or designations are assigned).
- `GET/POST/PUT/DELETE /api/organization/designations` — Designation management (deletion blocked if employees hold the designation).

## Attendance (`/api/attendance`)

- `GET /api/attendance/daily?date=YYYY-MM-DD` — Daily summary and attendance log scoped by role.
- `GET /api/attendance/monthly-report?year=YYYY&month=M` — Aggregated monthly attendance report.
- `POST /api/attendance` — Log or modify attendance (`createdBy`/`modifiedBy` tracked; employees restricted to self check-in for today).

## Leave (`/api/leave`)

- `GET /api/leave` — List leave requests scoped by role.
- `GET /api/leave/balances` — Leave balances by employee and year.
- `POST /api/leave` — Submit leave request with overlap validation and balance verification.
- `PATCH /api/leave/:id/review` — Approve or reject (`SUPER_ADMIN`, `HR_ADMIN`, or direct `MANAGER`).
- `PATCH /api/leave/:id/cancel` — Cancel pending request.

## Payroll (`/api/payroll`)

- `GET /api/payroll/my` — Authenticated employee's approved/paid payslips.
- `GET /api/payroll` — Full payroll ledger (`SUPER_ADMIN`, `HR_ADMIN`).
- `POST /api/payroll` — Create or update draft payroll entry (`SUPER_ADMIN`, `HR_ADMIN`).
- `POST /api/payroll/generate-batch` — Generate monthly draft payroll entries (`SUPER_ADMIN`, `HR_ADMIN`).
- `PATCH /api/payroll/:id/status` — Transition payroll status (`APPROVED` -> `PAID`).

## Performance (`/api/performance`)

- `GET /api/performance` — Role-scoped confidential performance reviews.
- `POST /api/performance` — Create review (`SUPER_ADMIN`, `HR_ADMIN`, or direct `MANAGER`).
- `PATCH /api/performance/:id/acknowledge` — Employee acknowledgment.

## Dashboard & Governance (`/api/dashboard`)

- `GET /api/dashboard/overview` — Live MongoDB KPIs, charts, birthdays, pending leave, and activity feed.
- `GET /api/dashboard/notifications` — User notifications.
- `PATCH /api/dashboard/notifications/:id/read` — Mark single or `all` notifications read.
- `GET /api/dashboard/audit-logs` — Administrative audit trail (`SUPER_ADMIN`, `HR_ADMIN`).
- `GET/POST/PATCH /api/dashboard/admin/users` — User provisioning and role assignment (`SUPER_ADMIN`).
