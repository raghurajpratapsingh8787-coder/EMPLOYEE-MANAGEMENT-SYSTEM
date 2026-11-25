import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Attendance } from '../models/Attendance';
import { Employee } from '../models/Employee';
import {
  attendanceUpsertSchema,
  monthQuerySchema,
  yearQuerySchema,
} from '../validators/schemas';
import { AppError } from '../middleware/security';
import { isHrOrAdmin } from '../utils/rbac';
import { recordAuditLog } from '../services/auditService';

export async function getAttendanceDashboard(req: Request, res: Response): Promise<void> {
  const date =
    typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

  const filter: Record<string, unknown> = { date };

  // Scope for MANAGER and EMPLOYEE
  if (req.auth!.role === 'EMPLOYEE' && req.auth!.employeeId) {
    filter.employeeId = req.auth!.employeeId;
  } else if (req.auth!.role === 'MANAGER' && req.auth!.employeeId) {
    const team = await Employee.find({
      $or: [{ reportingManagerId: req.auth!.employeeId }, { _id: req.auth!.employeeId }],
    })
      .select('_id')
      .lean();
    filter.employeeId = { $in: team.map((t) => t._id) };
  }

  const [records, totalActive] = await Promise.all([
    Attendance.find(filter)
      .populate({
        path: 'employeeId',
        select: 'employeeId fullName avatarUrl departmentId status',
        populate: { path: 'departmentId', select: 'name code' },
      })
      .populate('modifiedBy', 'fullName email')
      .sort({ updatedAt: -1 })
      .lean(),
    Employee.countDocuments({ status: { $in: ['ACTIVE', 'ON_LEAVE'] } }),
  ]);

  let present = 0;
  let absent = 0;
  let late = 0;
  let halfDay = 0;
  let onLeave = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') present += 1;
    else if (r.status === 'ABSENT') absent += 1;
    else if (r.status === 'LATE') late += 1;
    else if (r.status === 'HALF_DAY') halfDay += 1;
    else if (r.status === 'ON_LEAVE') onLeave += 1;
  }

  const attended = present + late + halfDay;
  const denom = records.length > 0 ? records.length : Math.max(1, totalActive);
  const attendancePct = Math.round((attended / denom) * 100);

  res.json({
    date,
    summary: {
      present,
      absent,
      late,
      halfDay,
      onLeave,
      totalLogged: records.length,
      attendancePercentage: attendancePct,
    },
    records,
  });
}

export async function getMonthlyAttendanceReport(req: Request, res: Response): Promise<void> {
  const year = yearQuerySchema.parse(req.query.year ?? new Date().getUTCFullYear());
  const month = monthQuerySchema.parse(req.query.month ?? new Date().getUTCMonth() + 1);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  const match: Record<string, unknown> = { date: { $regex: `^${prefix}` } };
  if (req.auth!.role === 'EMPLOYEE' && req.auth!.employeeId) {
    match.employeeId = new mongoose.Types.ObjectId(req.auth!.employeeId);
  } else if (req.auth!.role === 'MANAGER' && req.auth!.employeeId) {
    const team = await Employee.find({
      $or: [{ reportingManagerId: req.auth!.employeeId }, { _id: req.auth!.employeeId }],
    })
      .select('_id')
      .lean();
    match.employeeId = { $in: team.map((t) => t._id) };
  }

  const employeeStats = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$employeeId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        halfDay: { $sum: { $cond: [{ $eq: ['$status', 'HALF_DAY'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ['$status', 'ON_LEAVE'] }, 1, 0] } },
        totalHours: { $sum: '$workHours' },
      },
    },
    {
      $lookup: {
        from: 'employees',
        localField: '_id',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: '$employee' },
    {
      $lookup: {
        from: 'departments',
        localField: 'employee.departmentId',
        foreignField: '_id',
        as: 'department',
      },
    },
    { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        employeeId: '$employee.employeeId',
        fullName: '$employee.fullName',
        departmentName: '$department.name',
        present: 1,
        late: 1,
        halfDay: 1,
        absent: 1,
        onLeave: 1,
        totalHours: 1,
      },
    },
    { $sort: { fullName: 1 } },
  ]);

  res.json({ year, month, items: employeeStats });
}

export async function upsertAttendance(req: Request, res: Response): Promise<void> {
  const payload = attendanceUpsertSchema.parse(req.body);

  const isAdmin = isHrOrAdmin(req.auth!.role);
  const isSelfCheckIn = req.auth!.employeeId === payload.employeeId;

  if (!isAdmin) {
    if (!isSelfCheckIn) {
      throw new AppError(403, 'Not authorized to modify attendance for another employee');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (payload.date !== today) {
      throw new AppError(403, 'Employees can only log attendance for today');
    }
  }

  const existing = await Attendance.findOne({
    employeeId: payload.employeeId,
    date: payload.date,
  });

  let record;
  if (existing) {
    existing.status = payload.status;
    existing.checkIn = payload.checkIn;
    existing.checkOut = payload.checkOut;
    existing.workHours = payload.workHours;
    existing.notes = payload.notes;
    existing.modifiedBy = new mongoose.Types.ObjectId(req.auth!.userId);
    record = await existing.save();
  } else {
    record = await Attendance.create({
      ...payload,
      createdBy: req.auth!.userId,
      modifiedBy: req.auth!.userId,
    });
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: existing ? 'ATTENDANCE_MODIFIED' : 'ATTENDANCE_RECORDED',
    resourceType: 'Attendance',
    resourceId: record._id.toString(),
    summary: `Set attendance ${payload.status} on ${payload.date}`,
    ipAddress: req.ip,
  });

  res.status(existing ? 200 : 201).json({ record });
}
