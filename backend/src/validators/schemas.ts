import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

export const setupWorkspaceSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  seedSampleData: z.boolean().optional().default(true),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  newPassword: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  address: z.string().trim().min(2).max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  currentPassword: z.string().min(1).max(128).optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export const employeeCreateSchema = z.object({
  employeeId: z.string().trim().min(2).max(30).toUpperCase(),
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(5).max(30),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']),
  dateOfBirth: z.string().regex(dateRegex, 'Expected YYYY-MM-DD'),
  address: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  departmentId: z.string().regex(objectIdRegex, 'Invalid department ID'),
  designationId: z.string().regex(objectIdRegex, 'Invalid designation ID'),
  joiningDate: z.string().regex(dateRegex, 'Expected YYYY-MM-DD'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  salary: z.coerce.number().min(0).max(10000000),
  reportingManagerId: z
    .string()
    .regex(objectIdRegex)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).default('ACTIVE'),
  avatarUrl: z.string().trim().max(500).optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(16).toUpperCase(),
  description: z.string().trim().max(400).optional().default(''),
  headId: z
    .string()
    .regex(objectIdRegex)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
});

export const designationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  level: z.coerce.number().int().min(1).max(12),
  departmentId: z.string().regex(objectIdRegex, 'Invalid department ID'),
});

export const attendanceUpsertSchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID'),
  date: z.string().regex(dateRegex, 'Expected YYYY-MM-DD'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE']),
  checkIn: z.string().regex(timeRegex).optional().or(z.literal('')),
  checkOut: z.string().regex(timeRegex).optional().or(z.literal('')),
  workHours: z.coerce.number().min(0).max(24).optional().default(8),
  notes: z.string().trim().max(300).optional(),
});

export const leaveCreateSchema = z.object({
  employeeId: z.string().regex(objectIdRegex).optional(),
  leaveType: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'OTHER']),
  customTypeLabel: z.string().trim().max(60).optional(),
  startDate: z.string().regex(dateRegex, 'Expected YYYY-MM-DD'),
  endDate: z.string().regex(dateRegex, 'Expected YYYY-MM-DD'),
  reason: z.string().trim().min(5).max(500),
});

export const leaveReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewComment: z.string().trim().max(400).optional().default(''),
});

export const payrollCreateSchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID'),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  basicSalary: z.coerce.number().min(0).max(10000000),
  allowances: z.coerce.number().min(0).max(10000000).default(0),
  bonus: z.coerce.number().min(0).max(10000000).default(0),
  deductions: z.coerce.number().min(0).max(10000000).default(0),
  currency: z.string().trim().min(3).max(5).default('USD'),
  configurationLabel: z.string().trim().max(180).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const payrollStatusSchema = z.object({
  status: z.enum(['APPROVED', 'PAID']),
});

export const performanceCreateSchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID'),
  reviewPeriod: z.string().trim().min(2).max(60),
  reviewDate: z.string().regex(dateRegex, 'Expected YYYY-MM-DD'),
  rating: z.coerce.number().min(1).max(5),
  goals: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(160),
        targetDate: z.string().regex(dateRegex, 'Expected YYYY-MM-DD'),
        completionPct: z.coerce.number().min(0).max(100),
        status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
      })
    )
    .default([]),
  feedback: z.string().trim().min(5).max(1500),
  strengths: z.string().trim().max(800).optional().default(''),
  areasForGrowth: z.string().trim().max(800).optional().default(''),
  status: z.enum(['DRAFT', 'SHARED', 'ACKNOWLEDGED']).default('SHARED'),
});

export const adminCreateUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  fullName: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(128),
  role: z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']),
  employeeId: z
    .string()
    .regex(objectIdRegex)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
});
