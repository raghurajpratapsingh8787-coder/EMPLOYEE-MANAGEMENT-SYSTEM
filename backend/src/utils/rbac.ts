export type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export const ALL_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'];

export function isHrOrAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'HR_ADMIN';
}

export function canViewSalary(
  viewerRole: UserRole,
  viewerEmployeeId: string | undefined,
  targetEmployeeId: string
): boolean {
  if (isHrOrAdmin(viewerRole)) {
    return true;
  }
  return Boolean(viewerEmployeeId && viewerEmployeeId === targetEmployeeId);
}

export function canManageEmployees(role: UserRole): boolean {
  return isHrOrAdmin(role);
}

export function canManageDepartments(role: UserRole): boolean {
  return isHrOrAdmin(role);
}

export function canApproveLeave(
  approverRole: UserRole,
  approverEmployeeId: string | undefined,
  targetEmployeeId: string,
  targetManagerId: string | undefined
): boolean {
  if (approverEmployeeId && approverEmployeeId === targetEmployeeId) {
    // Prevent self-approval unless Super Admin explicitly overriding
    return approverRole === 'SUPER_ADMIN';
  }
  if (isHrOrAdmin(approverRole)) {
    return true;
  }
  if (approverRole === 'MANAGER') {
    return Boolean(approverEmployeeId && targetManagerId && approverEmployeeId === targetManagerId);
  }
  return false;
}

export function canAccessPayrollManagement(role: UserRole): boolean {
  return isHrOrAdmin(role);
}

export function canManageAttendance(role: UserRole): boolean {
  return isHrOrAdmin(role);
}

export function canViewPerformanceReview(
  viewerRole: UserRole,
  viewerEmployeeId: string | undefined,
  targetEmployeeId: string,
  targetManagerId: string | undefined,
  reviewStatus: 'DRAFT' | 'SHARED' | 'ACKNOWLEDGED'
): boolean {
  if (isHrOrAdmin(viewerRole)) {
    return true;
  }
  if (viewerRole === 'MANAGER' && viewerEmployeeId && targetManagerId === viewerEmployeeId) {
    return true;
  }
  if (viewerEmployeeId && viewerEmployeeId === targetEmployeeId) {
    return reviewStatus !== 'DRAFT';
  }
  return false;
}
