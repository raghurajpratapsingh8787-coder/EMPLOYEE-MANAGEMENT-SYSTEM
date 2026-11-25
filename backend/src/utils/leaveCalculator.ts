export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Counts inclusive business days (Mon-Fri) between two YYYY-MM-DD strings.
 */
export function calculateLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date format; expected YYYY-MM-DD');
  }

  if (end < start) {
    throw new Error('End date cannot be earlier than start date');
  }

  let businessDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      businessDays += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Fallback to at least 1 day if user explicitly selected a weekend single-day range
  if (businessDays === 0) {
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / 86400000) + 1;
  }

  return businessDays;
}

/**
 * Detects whether two inclusive date ranges overlap.
 */
export function doDateRangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export interface LeaveBalanceSnapshot {
  casualTotal: number;
  casualUsed: number;
  sickTotal: number;
  sickUsed: number;
  earnedTotal: number;
  earnedUsed: number;
  unpaidUsed: number;
}

export function getRemainingBalance(balance: LeaveBalanceSnapshot, leaveType: LeaveType): number {
  switch (leaveType) {
    case 'CASUAL':
      return Math.max(0, balance.casualTotal - balance.casualUsed);
    case 'SICK':
      return Math.max(0, balance.sickTotal - balance.sickUsed);
    case 'EARNED':
      return Math.max(0, balance.earnedTotal - balance.earnedUsed);
    case 'UNPAID':
    case 'OTHER':
      return Number.POSITIVE_INFINITY;
  }
}

export function canTransitionLeaveStatus(current: LeaveStatus, next: LeaveStatus): boolean {
  if (current === 'PENDING') {
    return next === 'APPROVED' || next === 'REJECTED' || next === 'CANCELLED';
  }
  return false;
}
