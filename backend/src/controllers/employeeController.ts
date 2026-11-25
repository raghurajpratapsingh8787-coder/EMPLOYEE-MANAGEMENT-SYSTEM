import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Employee } from '../models/Employee';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { LeaveBalance } from '../models/LeaveBalance';
import { PerformanceReview } from '../models/PerformanceReview';
import { Payroll } from '../models/Payroll';
import { AuditLog } from '../models/AuditLog';
import { employeeCreateSchema, employeeUpdateSchema } from '../validators/schemas';
import { AppError } from '../middleware/security';
import { canViewSalary, isHrOrAdmin } from '../utils/rbac';
import { detectSafeImageType, resolveConfinedPath } from '../utils/securityHelpers';
import { recordAuditLog } from '../services/auditService';

const AVATAR_UPLOAD_DIR = path.resolve(process.cwd(), '.data', 'uploads', 'avatars');

function sanitizeEmployeeForViewer(
  emp: Record<string, unknown>,
  viewerRole: 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE',
  viewerEmployeeId?: string
): Record<string, unknown> {
  const empIdStr = String(emp._id);
  const allowSalary = canViewSalary(viewerRole, viewerEmployeeId, empIdStr);
  if (allowSalary) {
    return emp;
  }
  const { salary: _omit, ...rest } = emp;
  return rest;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  // Prevent CSV formula injection
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function listEmployees(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const employmentType =
    typeof req.query.employmentType === 'string' ? req.query.employmentType.trim() : '';
  const sortField = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const allowedSortFields: Record<string, string> = {
    fullName: 'fullName',
    employeeId: 'employeeId',
    joiningDate: 'joiningDate',
    status: 'status',
    createdAt: 'createdAt',
  };

  const filter: Record<string, unknown> = {};

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ fullName: regex }, { email: regex }, { employeeId: regex }];
  }
  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    filter.departmentId = departmentId;
  }
  if (status && ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(status)) {
    filter.status = status;
  }
  if (employmentType && ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].includes(employmentType)) {
    filter.employmentType = employmentType;
  }

  // Managers can see all directory basics or filter by team; directory shows company directory without sensitive salaries
  const sortObj: Record<string, 1 | -1> = {
    [allowedSortFields[sortField] || 'createdAt']: sortOrder,
  };

  const [total, rawItems] = await Promise.all([
    Employee.countDocuments(filter),
    Employee.find(filter)
      .populate('departmentId', 'name code')
      .populate('designationId', 'name level')
      .populate('reportingManagerId', 'fullName employeeId')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const items = rawItems.map((item) =>
    sanitizeEmployeeForViewer(
      item as unknown as Record<string, unknown>,
      req.auth!.role,
      req.auth!.employeeId
    )
  );

  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function exportEmployeesCsv(req: Request, res: Response): Promise<void> {
  if (!isHrOrAdmin(req.auth!.role)) {
    throw new AppError(403, 'Only HR administrators can export employee records');
  }

  const employees = await Employee.find()
    .populate('departmentId', 'name code')
    .populate('designationId', 'name')
    .sort({ employeeId: 1 })
    .lean();

  const headers = [
    'Employee ID',
    'Full Name',
    'Email',
    'Phone',
    'Department',
    'Designation',
    'Employment Type',
    'Status',
    'Joining Date',
    'City',
    'State',
  ];

  const rows = employees.map((e) => {
    const dept = (e.departmentId as unknown as { name?: string })?.name || '';
    const desig = (e.designationId as unknown as { name?: string })?.name || '';
    return [
      escapeCsvCell(e.employeeId),
      escapeCsvCell(e.fullName),
      escapeCsvCell(e.email),
      escapeCsvCell(e.phone),
      escapeCsvCell(dept),
      escapeCsvCell(desig),
      escapeCsvCell(e.employmentType),
      escapeCsvCell(e.status),
      escapeCsvCell(e.joiningDate),
      escapeCsvCell(e.city),
      escapeCsvCell(e.state),
    ].join(',');
  });

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'EMPLOYEES_EXPORTED',
    resourceType: 'Employee',
    summary: `Exported ${employees.length} employee records to CSV`,
    ipAddress: req.ip,
  });

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="calibre-employees.csv"');
  res.send(csv);
}

export async function getEmployeeById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid employee ID');
  }

  const employee = await Employee.findById(id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'name level')
    .populate('reportingManagerId', 'fullName employeeId email')
    .lean();

  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }

  const viewerRole = req.auth!.role;
  const viewerEmpId = req.auth!.employeeId;
  const isSelf = viewerEmpId === id;
  const isManagerOfTarget =
    viewerRole === 'MANAGER' &&
    Boolean(employee.reportingManagerId) &&
    String((employee.reportingManagerId as unknown as { _id: unknown })._id) === viewerEmpId;
  const isAdmin = isHrOrAdmin(viewerRole);

  const sanitizedEmployee = sanitizeEmployeeForViewer(
    employee as unknown as Record<string, unknown>,
    viewerRole,
    viewerEmpId
  );

  // Restrict sensitive personal details (DOB, full address) if not self/HR/SuperAdmin
  if (!isAdmin && !isSelf) {
    delete sanitizedEmployee.dateOfBirth;
    delete sanitizedEmployee.address;
  }

  const [attendanceHistory, leaveHistory, leaveBalance, payrollHistory, performanceReviews, timeline] =
    await Promise.all([
      isAdmin || isSelf || isManagerOfTarget
        ? Attendance.find({ employeeId: id }).sort({ date: -1 }).limit(30).lean()
        : Promise.resolve([]),
      isAdmin || isSelf || isManagerOfTarget
        ? LeaveRequest.find({ employeeId: id }).sort({ createdAt: -1 }).limit(20).lean()
        : Promise.resolve([]),
      isAdmin || isSelf || isManagerOfTarget
        ? LeaveBalance.findOne({ employeeId: id, year: new Date().getUTCFullYear() }).lean()
        : Promise.resolve(null),
      canViewSalary(viewerRole, viewerEmpId, id)
        ? Payroll.find({ employeeId: id }).sort({ periodYear: -1, periodMonth: -1 }).limit(12).lean()
        : Promise.resolve([]),
      isAdmin || isSelf || isManagerOfTarget
        ? PerformanceReview.find({
            employeeId: id,
            ...(isSelf && !isAdmin ? { status: { $ne: 'DRAFT' } } : {}),
          })
            .populate('reviewerId', 'fullName employeeId')
            .sort({ reviewDate: -1 })
            .limit(10)
            .lean()
        : Promise.resolve([]),
      isAdmin
        ? AuditLog.find({ resourceType: 'Employee', resourceId: id }).sort({ createdAt: -1 }).limit(15).lean()
        : Promise.resolve([]),
    ]);

  res.json({
    employee: sanitizedEmployee,
    attendanceHistory,
    leaveHistory,
    leaveBalance,
    payrollHistory,
    performanceReviews,
    timeline,
  });
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  const payload = employeeCreateSchema.parse(req.body);

  const existing = await Employee.findOne({
    $or: [{ employeeId: payload.employeeId }, { email: payload.email }],
  }).lean();

  if (existing) {
    throw new AppError(
      409,
      existing.employeeId === payload.employeeId
        ? `Employee ID ${payload.employeeId} already exists`
        : `Email ${payload.email} is already registered`
    );
  }

  const employee = await Employee.create(payload);

  await LeaveBalance.create({
    employeeId: employee._id,
    year: new Date().getUTCFullYear(),
    casualTotal: 12,
    sickTotal: 10,
    earnedTotal: 15,
  });

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'EMPLOYEE_CREATED',
    resourceType: 'Employee',
    resourceId: employee._id.toString(),
    summary: `Created employee ${employee.fullName} (${employee.employeeId})`,
    ipAddress: req.ip,
  });

  const populated = await Employee.findById(employee._id)
    .populate('departmentId', 'name code')
    .populate('designationId', 'name level')
    .populate('reportingManagerId', 'fullName employeeId')
    .lean();

  res.status(201).json({ employee: populated });
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid employee ID');
  }

  const payload = employeeUpdateSchema.parse(req.body);

  if (payload.employeeId || payload.email) {
    const orClauses: Array<Record<string, unknown>> = [];
    if (payload.employeeId) orClauses.push({ employeeId: payload.employeeId });
    if (payload.email) orClauses.push({ email: payload.email });

    const duplicate = await Employee.findOne({
      _id: { $ne: id },
      $or: orClauses,
    }).lean();

    if (duplicate) {
      throw new AppError(409, 'Employee ID or email is already assigned to another employee');
    }
  }

  const updated = await Employee.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
    .populate('departmentId', 'name code')
    .populate('designationId', 'name level')
    .populate('reportingManagerId', 'fullName employeeId')
    .lean();

  if (!updated) {
    throw new AppError(404, 'Employee not found');
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'EMPLOYEE_UPDATED',
    resourceType: 'Employee',
    resourceId: id,
    summary: `Updated employee record ${updated.fullName} (${updated.employeeId})`,
    ipAddress: req.ip,
  });

  res.json({ employee: updated });
}

export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid employee ID');
  }

  const existing = await Employee.findById(id);
  if (!existing) {
    throw new AppError(404, 'Employee not found');
  }

  if (req.auth!.employeeId === id) {
    throw new AppError(400, 'You cannot delete your own active employee profile');
  }

  await Promise.all([
    Employee.findByIdAndDelete(id),
    Attendance.deleteMany({ employeeId: id }),
    LeaveRequest.deleteMany({ employeeId: id }),
    LeaveBalance.deleteMany({ employeeId: id }),
    Payroll.deleteMany({ employeeId: id }),
    PerformanceReview.deleteMany({ employeeId: id }),
  ]);

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'EMPLOYEE_DELETED',
    resourceType: 'Employee',
    resourceId: id,
    summary: `Deleted employee ${existing.fullName} (${existing.employeeId})`,
    ipAddress: req.ip,
  });

  res.json({ message: 'Employee deleted successfully' });
}

export async function bulkUpdateEmployeeStatus(req: Request, res: Response): Promise<void> {
  const { ids, status } = req.body as { ids?: unknown; status?: unknown };
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    typeof status !== 'string' ||
    !['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(status)
  ) {
    throw new AppError(400, 'Provide valid employee IDs and target status');
  }

  const validIds = ids.filter((id): id is string => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new AppError(400, 'No valid employee IDs provided');
  }

  const result = await Employee.updateMany({ _id: { $in: validIds } }, { status });

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'EMPLOYEES_BULK_STATUS',
    resourceType: 'Employee',
    summary: `Bulk updated ${result.modifiedCount} employees to status ${status}`,
    ipAddress: req.ip,
  });

  res.json({ updatedCount: result.modifiedCount });
}

export async function uploadEmployeeAvatar(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid employee ID');
  }

  const isSelf = req.auth!.employeeId === id;
  if (!isHrOrAdmin(req.auth!.role) && !isSelf) {
    throw new AppError(403, 'Not authorized to update this employee photo');
  }

  if (!req.file || !req.file.buffer) {
    throw new AppError(400, 'No image file provided');
  }

  const safeType = detectSafeImageType(req.file.buffer);
  if (!safeType) {
    throw new AppError(400, 'Invalid image file signature. Only JPEG, PNG, and WEBP are allowed.');
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }

  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
  const randomName = `${crypto.randomBytes(16).toString('hex')}${safeType.ext}`;
  const targetPath = resolveConfinedPath(AVATAR_UPLOAD_DIR, randomName);
  fs.writeFileSync(targetPath, req.file.buffer);

  // Remove old uploaded avatar file if present
  if (employee.avatarFile) {
    try {
      const oldPath = resolveConfinedPath(AVATAR_UPLOAD_DIR, employee.avatarFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  employee.avatarFile = randomName;
  employee.avatarUrl = `/api/employees/${id}/avatar?v=${Date.now()}`;
  await employee.save();

  res.json({ avatarUrl: employee.avatarUrl });
}

export async function getEmployeeAvatar(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid employee ID');
  }

  const employee = await Employee.findById(id).lean();
  if (!employee || !employee.avatarFile) {
    throw new AppError(404, 'Avatar not found');
  }

  const filePath = resolveConfinedPath(AVATAR_UPLOAD_DIR, employee.avatarFile);
  if (!fs.existsSync(filePath)) {
    throw new AppError(404, 'Avatar file missing');
  }

  res.sendFile(filePath);
}
