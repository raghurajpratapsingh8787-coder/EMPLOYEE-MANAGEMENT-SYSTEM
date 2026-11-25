import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createExpressApp } from '../app';

let mongoServer: MongoMemoryServer;
let server: http.Server;
let baseUrl: string;
let adminToken: string;
let employeeToken: string;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: 'calibre_hr_test' });
  const app = createExpressApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongoServer.stop();
});

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('unauthenticated requests to protected APIs are rejected with 401', async () => {
  const empRes = await apiFetch('/api/employees');
  assert.equal(empRes.status, 401);

  const payRes = await apiFetch('/api/payroll');
  assert.equal(payRes.status, 401);

  const dashRes = await apiFetch('/api/dashboard/overview');
  assert.equal(dashRes.status, 401);
});

test('bootstrap setup initializes workspace once and blocks repeat setup', async () => {
  const status1 = await apiFetch('/api/auth/bootstrap-status');
  assert.equal(status1.status, 200);
  assert.equal(status1.data.needsSetup, true);

  const setup = await apiFetch('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Sarah Chen',
      email: 'sarah.chen@calibrehr.io',
      password: 'SecurePassword!2026',
      seedSampleData: true,
    }),
  });
  assert.equal(setup.status, 201);
  assert.ok(setup.data.accessToken);
  assert.equal(setup.data.user.role, 'SUPER_ADMIN');
  adminToken = setup.data.accessToken;

  const repeat = await apiFetch('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Attacker',
      email: 'attacker@example.com',
      password: 'Password123!',
    }),
  });
  assert.equal(repeat.status, 403);
});

test('department deletion is blocked while employees remain assigned', async () => {
  const deptRes = await apiFetch('/api/organization/departments', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(deptRes.status, 200);
  const eng = deptRes.data.items.find((d: { code: string }) => d.code === 'ENG');
  assert.ok(eng);

  const delRes = await apiFetch(`/api/organization/departments/${eng._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(delRes.status, 409);
});

test('employee CRUD prevents duplicate IDs and enforces RBAC on salary and payroll', async () => {
  const listRes = await apiFetch('/api/employees', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.items.length >= 10);

  const firstEmp = listRes.data.items[0];
  // Admin creates an EMPLOYEE login for a staff member
  const targetEmp = listRes.data.items.find((e: { employeeId: string }) => e.employeeId === 'EMP-1006');
  assert.ok(targetEmp);

  const createLogin = await apiFetch('/api/dashboard/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: targetEmp.email,
      fullName: targetEmp.fullName,
      password: 'EmployeePass!2026',
      role: 'EMPLOYEE',
      employeeId: targetEmp._id,
    }),
  });
  assert.equal(createLogin.status, 201);

  // Duplicate employeeId rejected
  const dupEmp = await apiFetch('/api/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeId: firstEmp.employeeId,
      fullName: 'Duplicate Person',
      email: 'unique.person@calibrehr.io',
      phone: '555-0199',
      gender: 'Male',
      dateOfBirth: '1990-01-01',
      address: '100 Main St',
      city: 'Austin',
      state: 'TX',
      departmentId: firstEmp.departmentId._id,
      designationId: firstEmp.designationId._id,
      joiningDate: '2026-11-01',
      employmentType: 'FULL_TIME',
      salary: 8000,
      status: 'ACTIVE',
    }),
  });
  assert.equal(dupEmp.status, 409);

  // Login as standard EMPLOYEE
  const empLogin = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: targetEmp.email,
      password: 'EmployeePass!2026',
    }),
  });
  assert.equal(empLogin.status, 200);
  employeeToken = empLogin.data.accessToken;

  // EMPLOYEE cannot access company payroll
  const payForbidden = await apiFetch('/api/payroll', {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert.equal(payForbidden.status, 403);

  // EMPLOYEE cannot escalate own role through profile update
  await apiFetch('/api/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${employeeToken}` },
    body: JSON.stringify({ fullName: targetEmp.fullName, role: 'SUPER_ADMIN' }),
  });
  const meCheck = await apiFetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert.equal(meCheck.data.user.role, 'EMPLOYEE');

  // EMPLOYEE cannot see other employees' salaries in directory
  const empDir = await apiFetch('/api/employees', {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  const other = empDir.data.items.find((e: { _id: string }) => e._id !== targetEmp._id);
  assert.equal(other.salary, undefined);
});

test('leave application prevents overlapping date ranges', async () => {
  const apply1 = await apiFetch('/api/leave', {
    method: 'POST',
    headers: { Authorization: `Bearer ${employeeToken}` },
    body: JSON.stringify({
      leaveType: 'CASUAL',
      startDate: '2026-12-10',
      endDate: '2026-12-11',
      reason: 'Attending winter conference.',
    }),
  });
  assert.equal(apply1.status, 201);

  const overlap = await apiFetch('/api/leave', {
    method: 'POST',
    headers: { Authorization: `Bearer ${employeeToken}` },
    body: JSON.stringify({
      leaveType: 'CASUAL',
      startDate: '2026-12-11',
      endDate: '2026-12-12',
      reason: 'Overlapping request test.',
    }),
  });
  assert.equal(overlap.status, 409);
});

test('NoSQL operator injection in login payload is blocked/sanitized', async () => {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: { $gt: '' },
      password: { $ne: '' },
    }),
  });
  assert.equal(res.status, 400);
});

test('CORS rejects untrusted .run.app origins and omits X-Frame-Options for iframe compatibility', async () => {
  const res = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://evil-attacker.run.app' },
  });
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal(res.headers.get('x-frame-options'), null);
});

test('CSRF protection rejects state-changing auth request missing Origin and X-Requested-With', async () => {
  const res = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(res.status, 403);
});

test('dashboard overview scopes pending leaves and audit activities by role', async () => {
  const empDash = await apiFetch('/api/dashboard/overview', {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert.equal(empDash.status, 200);
  assert.ok(Array.isArray(empDash.data.recentActivities));
  // Standard employee must not receive Super Admin's audit log entries
  for (const act of empDash.data.recentActivities) {
    assert.notEqual(act.actorEmail, 'sarah.chen@calibrehr.io');
  }
});

test('avatarUrl rejects dangerous URI schemes and report endpoints enforce integer bounds', async () => {
  const listRes = await apiFetch('/api/employees', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const firstEmp = listRes.data.items[0];

  const badAvatar = await apiFetch('/api/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeId: 'EMP-9991',
      fullName: 'Scheme Test',
      email: 'scheme.test@calibrehr.io',
      phone: '555-0191',
      gender: 'Female',
      dateOfBirth: '1992-05-10',
      address: '200 Elm St',
      city: 'Austin',
      state: 'TX',
      departmentId: firstEmp.departmentId._id,
      designationId: firstEmp.designationId._id,
      joiningDate: '2026-11-01',
      employmentType: 'FULL_TIME',
      salary: 7500,
      status: 'ACTIVE',
      avatarUrl: 'javascript:alert(1)',
    }),
  });
  assert.equal(badAvatar.status, 400);

  const badMonth = await apiFetch('/api/attendance/monthly-report?year=2026&month=99', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(badMonth.status, 400);

  const badBatch = await apiFetch('/api/payroll/generate-batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ periodMonth: 'abc', periodYear: 2026 }),
  });
  assert.equal(badBatch.status, 400);
});

test('Super Admin cannot demote or deactivate own account', async () => {
  const meRes = await apiFetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(meRes.status, 200);
  const selfId = meRes.data.user._id;

  const demoteRes = await apiFetch(`/api/dashboard/admin/users/${selfId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'EMPLOYEE' }),
  });
  assert.equal(demoteRes.status, 400);

  const deactivateRes = await apiFetch(`/api/dashboard/admin/users/${selfId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isActive: false }),
  });
  assert.equal(deactivateRes.status, 400);
});
