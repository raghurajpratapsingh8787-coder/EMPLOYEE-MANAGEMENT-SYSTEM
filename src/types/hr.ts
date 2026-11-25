export type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeId?: string;
  lastLogin?: string;
}

export interface DepartmentRef {
  _id: string;
  name: string;
  code: string;
  description?: string;
  headId?: { _id: string; fullName: string; employeeId: string; avatarUrl?: string } | string;
  employeeCount?: number;
}

export interface DesignationRef {
  _id: string;
  name: string;
  level: number;
  departmentId: DepartmentRef | string;
  employeeCount?: number;
}

export interface EmployeeRecord {
  _id: string;
  employeeId: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  dateOfBirth?: string;
  address?: string;
  city: string;
  state: string;
  departmentId: DepartmentRef;
  designationId: DesignationRef;
  joiningDate: string;
  employmentType: EmploymentType;
  salary?: number;
  reportingManagerId?: { _id: string; fullName: string; employeeId: string; email?: string } | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  _id: string;
  employeeId: EmployeeRecord | string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  workHours: number;
  notes?: string;
  modifiedBy?: { _id: string; fullName: string; email: string };
}

export interface LeaveRequestRecord {
  _id: string;
  employeeId: EmployeeRecord;
  leaveType: LeaveType;
  customTypeLabel?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: { _id: string; fullName: string; email: string };
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LeaveBalanceRecord {
  _id: string;
  employeeId: { _id: string; employeeId: string; fullName: string; avatarUrl?: string } | string;
  year: number;
  casualTotal: number;
  casualUsed: number;
  sickTotal: number;
  sickUsed: number;
  earnedTotal: number;
  earnedUsed: number;
  unpaidUsed: number;
}

export interface PayrollRecord {
  _id: string;
  employeeId: EmployeeRecord;
  periodMonth: number;
  periodYear: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  currency: string;
  configurationLabel: string;
  status: PayrollStatus;
  approvedBy?: { _id: string; fullName: string };
  paidAt?: string;
  notes?: string;
}

export interface PerformanceGoal {
  title: string;
  targetDate: string;
  completionPct: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface PerformanceReviewRecord {
  _id: string;
  employeeId: EmployeeRecord;
  reviewerId: { _id: string; fullName: string; employeeId: string };
  reviewPeriod: string;
  reviewDate: string;
  rating: number;
  goals: PerformanceGoal[];
  feedback: string;
  strengths: string;
  areasForGrowth: string;
  status: 'DRAFT' | 'SHARED' | 'ACKNOWLEDGED';
}

export interface NotificationRecord {
  _id: string;
  title: string;
  message: string;
  category: 'LEAVE' | 'PAYROLL' | 'ATTENDANCE' | 'PERFORMANCE' | 'SYSTEM';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  _id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  createdAt: string;
}

export interface DashboardOverviewData {
  kpis: {
    totalEmployees: number;
    activeEmployees: number;
    onLeave: number;
    newEmployees: number;
    totalDepartments: number;
    attendanceRate: number;
  };
  charts: {
    monthlyGrowth: Array<{ month: string; headcount: number; hires: number }>;
    departmentDistribution: Array<{ name: string; count: number }>;
    attendanceTrend: Array<{ date: string; present: number; late: number; absent: number }>;
    statusDistribution: Array<{ status: string; value: number }>;
  };
  recentEmployees: Array<{
    _id: string;
    employeeId: string;
    fullName: string;
    avatarUrl?: string;
    department: string;
    designation: string;
    joiningDate: string;
    status: EmployeeStatus;
  }>;
  upcomingBirthdays: Array<{
    _id: string;
    fullName: string;
    avatarUrl?: string;
    department: string;
    dateOfBirth: string;
    daysUntil: number;
  }>;
  pendingLeaves: LeaveRequestRecord[];
  recentActivities: AuditLogRecord[];
  latestAttendanceDate: string;
}
