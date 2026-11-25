import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Employee } from '../models/Employee';
import { Department } from '../models/Department';
import { Attendance } from '../models/Attendance';
import { LeaveRequest } from '../models/LeaveRequest';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { adminCreateUserSchema, adminUpdateUserSchema } from '../validators/schemas';
import { AppError } from '../middleware/security';
import { isHrOrAdmin } from '../utils/rbac';
import { recordAuditLog } from '../services/auditService';

export async function getDashboardOverview(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const todayStr = now.toISOString().slice(0, 10);

  const viewerRole = req.auth!.role;
  const viewerEmpId = req.auth!.employeeId;
  const isAdmin = isHrOrAdmin(viewerRole);

  let pendingLeaveFilter: Record<string, unknown> = { status: 'PENDING' };
  if (!isAdmin) {
    if (viewerRole === 'MANAGER' && viewerEmpId) {
      const team = await Employee.find({
        $or: [{ reportingManagerId: viewerEmpId }, { _id: viewerEmpId }],
      })
        .select('_id')
        .lean();
      pendingLeaveFilter = { status: 'PENDING', employeeId: { $in: team.map((t) => t._id) } };
    } else if (viewerEmpId) {
      pendingLeaveFilter = { status: 'PENDING', employeeId: viewerEmpId };
    } else {
      pendingLeaveFilter = { _id: null };
    }
  }

  const activityFilter: Record<string, unknown> = isAdmin
    ? {}
    : { actorUserId: req.auth!.userId };

  const [
    allEmployees,
    departments,
    recentAttendanceDates,
    pendingLeaves,
    recentActivities,
  ] = await Promise.all([
    Employee.find()
      .populate('departmentId', 'name code')
      .populate('designationId', 'name')
      .sort({ joiningDate: -1 })
      .lean(),
    Department.find().lean(),
    Attendance.distinct('date'),
    LeaveRequest.find(pendingLeaveFilter)
      .populate('employeeId', 'fullName employeeId avatarUrl')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    AuditLog.find(activityFilter).sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  const totalEmployees = allEmployees.length;
  const activeEmployees = allEmployees.filter((e) => e.status === 'ACTIVE').length;
  const onLeaveCount = allEmployees.filter((e) => e.status === 'ON_LEAVE').length;
  const newEmployees = allEmployees.filter((e) => e.joiningDate.startsWith(monthPrefix)).length;
  const totalDepartments = departments.length;

  // Attendance analytics across recent logged dates
  const sortedDates = [...recentAttendanceDates].sort().slice(-7);
  const latestDate = sortedDates[sortedDates.length - 1] || todayStr;
  const recentAttendance = await Attendance.find({ date: { $in: sortedDates } }).lean();

  const latestDayRecords = recentAttendance.filter((r) => r.date === latestDate);
  const presentOrLateToday = latestDayRecords.filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY'
  ).length;
  const attendanceRate =
    latestDayRecords.length > 0
      ? Math.round((presentOrLateToday / latestDayRecords.length) * 1000) / 10
      : 0;

  // Monthly employee growth (past 6 months derived from real joining dates)
  const monthlyGrowth: Array<{ month: string; headcount: number; hires: number }> = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(Date.UTC(currentYear, currentMonth - 1 - offset, 1));
    const ym = d.toISOString().slice(0, 7);
    const label = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const monthEnd = `${ym}-31`;
    const headcount = allEmployees.filter((e) => e.joiningDate <= monthEnd).length;
    const hires = allEmployees.filter((e) => e.joiningDate.startsWith(ym)).length;
    monthlyGrowth.push({ month: label, headcount, hires });
  }

  // Department-wise employee distribution
  const deptCounts = new Map<string, number>();
  for (const emp of allEmployees) {
    const dName = (emp.departmentId as unknown as { name?: string })?.name || 'Unassigned';
    deptCounts.set(dName, (deptCounts.get(dName) || 0) + 1);
  }
  const departmentDistribution = Array.from(deptCounts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  // Employee status distribution
  const statusMap = new Map<string, number>();
  for (const emp of allEmployees) {
    statusMap.set(emp.status, (statusMap.get(emp.status) || 0) + 1);
  }
  const statusDistribution = Array.from(statusMap.entries()).map(([status, value]) => ({
    status: status.replace('_', ' '),
    value,
  }));

  // Attendance trend across last 7 logged dates
  const attendanceTrend = sortedDates.map((date) => {
    const dayLogs = recentAttendance.filter((r) => r.date === date);
    return {
      date: date.slice(5),
      present: dayLogs.filter((r) => r.status === 'PRESENT').length,
      late: dayLogs.filter((r) => r.status === 'LATE').length,
      absent: dayLogs.filter((r) => r.status === 'ABSENT' || r.status === 'ON_LEAVE').length,
    };
  });

  // Upcoming birthdays within next 30 days
  const upcomingBirthdays = allEmployees
    .map((emp) => {
      const [, m, d] = emp.dateOfBirth.split('-').map(Number);
      let nextBday = new Date(Date.UTC(currentYear, (m || 1) - 1, d || 1));
      const todayUtc = new Date(Date.UTC(currentYear, now.getUTCMonth(), now.getUTCDate()));
      if (nextBday < todayUtc) {
        nextBday = new Date(Date.UTC(currentYear + 1, (m || 1) - 1, d || 1));
      }
      const daysUntil = Math.round((nextBday.getTime() - todayUtc.getTime()) / 86400000);
      return {
        _id: emp._id,
        fullName: emp.fullName,
        avatarUrl: emp.avatarUrl,
        department: (emp.departmentId as unknown as { name?: string })?.name || '',
        dateOfBirth: emp.dateOfBirth,
        daysUntil,
      };
    })
    .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  const recentEmployees = allEmployees.slice(0, 5).map((e) => ({
    _id: e._id,
    employeeId: e.employeeId,
    fullName: e.fullName,
    avatarUrl: e.avatarUrl,
    department: (e.departmentId as unknown as { name?: string })?.name || '',
    designation: (e.designationId as unknown as { name?: string })?.name || '',
    joiningDate: e.joiningDate,
    status: e.status,
  }));

  res.json({
    kpis: {
      totalEmployees,
      activeEmployees,
      onLeave: onLeaveCount,
      newEmployees,
      totalDepartments,
      attendanceRate,
    },
    charts: {
      monthlyGrowth,
      departmentDistribution,
      attendanceTrend,
      statusDistribution,
    },
    recentEmployees,
    upcomingBirthdays,
    pendingLeaves,
    recentActivities,
    latestAttendanceDate: latestDate,
  });
}

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const items = await Notification.find({ recipientUserId: req.auth!.userId })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  const unreadCount = items.filter((i) => !i.isRead).length;
  res.json({ items, unreadCount });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (id === 'all') {
    await Notification.updateMany({ recipientUserId: req.auth!.userId, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked read' });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid notification ID');
  }

  await Notification.findOneAndUpdate(
    { _id: id, recipientUserId: req.auth!.userId },
    { isRead: true }
  );
  res.json({ message: 'Notification marked read' });
}

export async function listAuditLogs(_req: Request, res: Response): Promise<void> {
  const items = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json({ items });
}

export async function listAdminUsers(_req: Request, res: Response): Promise<void> {
  const users = await User.find()
    .select('-passwordHash -resetTokenHash -resetTokenExpires')
    .populate('employeeId', 'employeeId fullName')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ items: users });
}

export async function createAdminUser(req: Request, res: Response): Promise<void> {
  const payload = adminCreateUserSchema.parse(req.body);
  const existing = await User.findOne({ email: payload.email }).lean();
  if (existing) {
    throw new AppError(409, 'A user account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await User.create({
    email: payload.email,
    fullName: payload.fullName,
    passwordHash,
    role: payload.role,
    employeeId: payload.employeeId,
    isActive: true,
  });

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'USER_ACCOUNT_CREATED',
    resourceType: 'User',
    resourceId: user._id.toString(),
    summary: `Created ${payload.role} account for ${payload.email}`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      employeeId: user.employeeId,
    },
  });
}

export async function updateUserRoleOrStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid user ID');
  }

  const { role, isActive } = adminUpdateUserSchema.parse(req.body);
  const updates: Record<string, unknown> = {};

  if (id === req.auth!.userId && isActive === false) {
    throw new AppError(400, 'You cannot deactivate your own Super Admin account');
  }
  if (id === req.auth!.userId && role && role !== req.auth!.role) {
    throw new AppError(400, 'You cannot change your own Super Admin role');
  }

  if (role !== undefined) {
    updates.role = role;
  }
  if (isActive !== undefined) {
    updates.isActive = isActive;
  }

  const updated = await User.findByIdAndUpdate(id, updates, { new: true })
    .select('-passwordHash -resetTokenHash -resetTokenExpires')
    .lean();
  if (!updated) {
    throw new AppError(404, 'User account not found');
  }

  if (isActive === false) {
    await Session.updateMany({ userId: id, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'USER_ACCESS_UPDATED',
    resourceType: 'User',
    resourceId: id,
    summary: `Updated access permissions for ${updated.email}`,
    ipAddress: req.ip,
  });

  res.json({ user: updated });
}
