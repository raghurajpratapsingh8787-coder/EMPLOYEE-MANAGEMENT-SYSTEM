# Security Architecture & Hardening

1. **Authentication & Session Lifecycle**:
   - Passwords hashed with `bcryptjs` (cost factor 12).
   - Short-lived JWT access tokens (15m) held strictly in React JavaScript memory (never `localStorage` or `sessionStorage`).
   - Refresh tokens stored as SHA-256 hashes in the MongoDB `Session` collection with rotation on every refresh and explicit revocation on logout, password reset, or account deactivation.
   - Account lockout enforced after 5 consecutive failed login attempts.

2. **Authorization & Privacy (RBAC)**:
   - Every protected route requires `requireAuth` and explicit `requireRoles(...)` or resource-ownership checks.
   - Salary and payroll data are strictly restricted to `SUPER_ADMIN`, `HR_ADMIN`, or the owning employee's own payslips.
   - Users cannot escalate or alter their own role via profile APIs.
   - Sensitive personal fields (`dateOfBirth`, `address`) are stripped for directory views by non-HR peers.

3. **Input, Injection & File Upload Defenses**:
   - `helmet` security headers and strict CORS origin allowlist.
   - `express-rate-limit` on `/api/auth/*` and `/api/*`.
   - `noSqlSanitizer` recursively removes `$` operators and `.` keys from `req.body`, `req.query`, and `req.params`.
   - Zod schemas validate and coerce all payloads; Mongoose `ObjectId` format is validated before database queries.
   - Profile photos are validated by binary magic-byte signatures (JPEG, PNG, WEBP), assigned random hex filenames, stored privately in `.data/uploads/avatars/`, and served through confined path checks (`resolveConfinedPath`).
   - CSV exports neutralize formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`).
