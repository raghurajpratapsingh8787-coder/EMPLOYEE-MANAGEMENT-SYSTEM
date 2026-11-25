import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { calculatePayroll, summarizePayrollBatch } from '../utils/payrollCalculator';
import {
  calculateLeaveDays,
  doDateRangesOverlap,
  getRemainingBalance,
  canTransitionLeaveStatus,
} from '../utils/leaveCalculator';
import {
  sanitizeNoSqlPayload,
  detectSafeImageType,
  resolveConfinedPath,
} from '../utils/securityHelpers';
import {
  canViewSalary,
  canApproveLeave,
  canViewPerformanceReview,
} from '../utils/rbac';

test('calculatePayroll computes gross and net accurately and prevents negatives', () => {
  const result = calculatePayroll({
    basicSalary: 8500,
    allowances: 1200.5,
    bonus: 500,
    deductions: 1150.25,
  });
  assert.equal(result.grossSalary, 10200.5);
  assert.equal(result.netSalary, 9050.25);

  const clamped = calculatePayroll({
    basicSalary: 1000,
    allowances: 0,
    bonus: 0,
    deductions: 1500,
  });
  assert.equal(clamped.netSalary, 0);

  assert.throws(() =>
    calculatePayroll({ basicSalary: -100, allowances: 0, bonus: 0, deductions: 0 })
  );
});

test('summarizePayrollBatch aggregates totals accurately', () => {
  const a = calculatePayroll({ basicSalary: 5000, allowances: 500, bonus: 0, deductions: 400 });
  const b = calculatePayroll({ basicSalary: 7000, allowances: 800, bonus: 200, deductions: 600 });
  const summary = summarizePayrollBatch([a, b]);
  assert.equal(summary.count, 2);
  assert.equal(summary.totalGross, 13500);
  assert.equal(summary.totalDeductions, 1000);
  assert.equal(summary.totalNet, 12500);
});

test('leaveCalculator counts business days and detects overlaps', () => {
  // 2026-11-23 (Mon) to 2026-11-27 (Fri) = 5 business days
  assert.equal(calculateLeaveDays('2026-11-23', '2026-11-27'), 5);
  // Across weekend: 2026-11-20 (Fri) to 2026-11-23 (Mon) = 2 business days
  assert.equal(calculateLeaveDays('2026-11-20', '2026-11-23'), 2);
  assert.throws(() => calculateLeaveDays('2026-11-27', '2026-11-23'));

  assert.equal(
    doDateRangesOverlap(
      { startDate: '2026-11-10', endDate: '2026-11-12' },
      { startDate: '2026-11-12', endDate: '2026-11-15' }
    ),
    true
  );
  assert.equal(
    doDateRangesOverlap(
      { startDate: '2026-11-10', endDate: '2026-11-12' },
      { startDate: '2026-11-13', endDate: '2026-11-15' }
    ),
    false
  );
});

test('leave balance and state transition rules behave strictly', () => {
  const bal = {
    casualTotal: 12,
    casualUsed: 4,
    sickTotal: 10,
    sickUsed: 2,
    earnedTotal: 15,
    earnedUsed: 5,
    unpaidUsed: 0,
  };
  assert.equal(getRemainingBalance(bal, 'CASUAL'), 8);
  assert.equal(getRemainingBalance(bal, 'SICK'), 8);
  assert.equal(getRemainingBalance(bal, 'EARNED'), 10);
  assert.equal(getRemainingBalance(bal, 'UNPAID'), Number.POSITIVE_INFINITY);

  assert.equal(canTransitionLeaveStatus('PENDING', 'APPROVED'), true);
  assert.equal(canTransitionLeaveStatus('PENDING', 'CANCELLED'), true);
  assert.equal(canTransitionLeaveStatus('APPROVED', 'REJECTED'), false);
});

test('securityHelpers strip NoSQL operators, verify magic bytes, and confine paths', () => {
  const dirty = {
    email: 'user@example.com',
    $gt: '',
    nested: { 'role.admin': true, safe: 'ok', $ne: null },
  };
  const clean = sanitizeNoSqlPayload(dirty);
  assert.deepEqual(clean, {
    email: 'user@example.com',
    nested: { safe: 'ok' },
  });

  const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(detectSafeImageType(jpegBuf)?.ext, '.jpg');

  const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert.equal(detectSafeImageType(pngBuf)?.ext, '.png');

  const exeBuf = Buffer.from('MZfakeexecutabledata');
  assert.equal(detectSafeImageType(exeBuf), null);

  const base = '/tmp/uploads';
  assert.equal(resolveConfinedPath(base, 'avatar123.jpg'), path.resolve(base, 'avatar123.jpg'));
  assert.throws(() => resolveConfinedPath(base, '../../etc/passwd'));
});

test('RBAC guards enforce salary, leave approval, and review confidentiality', () => {
  assert.equal(canViewSalary('EMPLOYEE', 'emp1', 'emp1'), true);
  assert.equal(canViewSalary('EMPLOYEE', 'emp1', 'emp2'), false);
  assert.equal(canViewSalary('MANAGER', 'mgr1', 'emp1'), false);
  assert.equal(canViewSalary('HR_ADMIN', 'hr1', 'emp2'), true);

  assert.equal(canApproveLeave('MANAGER', 'mgr1', 'emp1', 'mgr1'), true);
  assert.equal(canApproveLeave('MANAGER', 'mgr1', 'emp2', 'mgr2'), false);
  assert.equal(canApproveLeave('HR_ADMIN', 'hr1', 'hr1', undefined), false);
  assert.equal(canApproveLeave('SUPER_ADMIN', 'sa1', 'sa1', undefined), true);

  assert.equal(canViewPerformanceReview('EMPLOYEE', 'emp1', 'emp1', 'mgr1', 'DRAFT'), false);
  assert.equal(canViewPerformanceReview('EMPLOYEE', 'emp1', 'emp1', 'mgr1', 'SHARED'), true);
  assert.equal(canViewPerformanceReview('MANAGER', 'mgr1', 'emp1', 'mgr1', 'DRAFT'), true);
});
