import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LeaveRequest } from '../models/LeaveRequest';
import { LeaveBalance } from '../models/LeaveBalance';
import { Employee } from '../models/Employee';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { leaveCreateSchema, leaveReviewSchema, yearQuerySchema } from '../validators/schemas';
import { AppError } from '../middleware/security';
import {
  calculateLeaveDays,
  canTransitionLeaveStatus,
  doDateRangesOverlap,
  getRemainingBalance,
} from '../utils/leaveCalculator';
import { canApproveLeave, isHrOrAdmin } from '../utils/rbac';
import { recordAuditLog } from '../services/auditService';

export async function listLeaveRequests(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const filter: Record<string, unknown> = {};

  if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
    filter.status = status;
  }

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

  const items = await LeaveRequest.find(filter)
    .populate({
      path: 'employeeId',
      select: 'employeeId fullName avatarUrl departmentId reportingManagerId',
      populate: { path: 'departmentId', select: 'name code' },
    })
    .populate('reviewedBy', 'fullName email')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ items });
}

export async function getLeaveBalances(req: Request, res: Response): Promise<void> {
  const year = yearQuerySchema.parse(req.query.year ?? new Date().getUTCFullYear());
  const filter: Record<string, unknown> = { year };

  if (req.auth!.role === 'MANAGER' && req.auth!.employeeId) {
    const team = await Employee.find({
      $or: [{ reportingManagerId: req.auth!.employeeId }, { _id: req.auth!.employeeId }],
    })
      .select('_id')
      .lean();
    filter.employeeId = { $in: team.map((t) => t._id) };
  } else if (!isHrOrAdmin(req.auth!.role) && req.auth!.employeeId) {
    filter.employeeId = req.auth!.employeeId;
  }

  const items = await LeaveBalance.find(filter)
    .populate('employeeId', 'employeeId fullName avatarUrl')
    .lean();

  res.json({ year, items });
}

export async function applyLeave(req: Request, res: Response): Promise<void> {
  const payload = leaveCreateSchema.parse(req.body);
  const targetEmployeeId =
    isHrOrAdmin(req.auth!.role) && payload.employeeId
      ? payload.employeeId
      : req.auth!.employeeId;

  if (!targetEmployeeId || !mongoose.Types.ObjectId.isValid(targetEmployeeId)) {
    throw new AppError(400, 'No employee record associated with this request');
  }

  const totalDays = calculateLeaveDays(payload.startDate, payload.endDate);

  // Prevent overlapping PENDING or APPROVED leave requests
  const existingLeaves = await LeaveRequest.find({
    employeeId: targetEmployeeId,
    status: { $in: ['PENDING', 'APPROVED'] },
  }).lean();

  const hasOverlap = existingLeaves.some((l) =>
    doDateRangesOverlap(
      { startDate: payload.startDate, endDate: payload.endDate },
      { startDate: l.startDate, endDate: l.endDate }
    )
  );
  if (hasOverlap) {
    throw new AppError(409, 'Leave dates overlap with an existing pending or approved leave request');
  }

  const year = Number(payload.startDate.slice(0, 4));
  let balance = await LeaveBalance.findOne({ employeeId: targetEmployeeId, year });
  if (!balance) {
    balance = await LeaveBalance.create({ employeeId: targetEmployeeId, year });
  }

  const remaining = getRemainingBalance(balance, payload.leaveType);
  if (remaining < totalDays) {
    throw new AppError(
      400,
      `Insufficient ${payload.leaveType.toLowerCase()} leave balance (${remaining} days remaining, ${totalDays} requested)`
    );
  }

  const leave = await LeaveRequest.create({
    employeeId: targetEmployeeId,
    leaveType: payload.leaveType,
    customTypeLabel: payload.customTypeLabel,
    startDate: payload.startDate,
    endDate: payload.endDate,
    totalDays,
    reason: payload.reason,
    status: 'PENDING',
  });

  // Notify HR Admins
  const hrUsers = await User.find({ role: { $in: ['SUPER_ADMIN', 'HR_ADMIN'] }, isActive: true })
    .select('_id')
    .lean();
  const emp = await Employee.findById(targetEmployeeId).select('fullName').lean();

  if (hrUsers.length > 0) {
    await Notification.insertMany(
      hrUsers.map((u) => ({
        recipientUserId: u._id,
        title: 'New Leave Request',
        message: `${emp?.fullName || 'An employee'} requested ${totalDays} day(s) of ${payload.leaveType.toLowerCase()} leave.`,
        category: 'LEAVE',
        link: '/leave',
      }))
    );
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'LEAVE_APPLIED',
    resourceType: 'LeaveRequest',
    resourceId: leave._id.toString(),
    summary: `Submitted ${payload.leaveType} leave (${payload.startDate} to ${payload.endDate})`,
    ipAddress: req.ip,
  });

  res.status(201).json({ leave });
}

export async function reviewLeaveRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid leave request ID');
  }

  const { status, reviewComment } = leaveReviewSchema.parse(req.body);
  const leave = await LeaveRequest.findById(id);
  if (!leave) {
    throw new AppError(404, 'Leave request not found');
  }

  if (!canTransitionLeaveStatus(leave.status, status)) {
    throw new AppError(400, `Cannot change leave status from ${leave.status} to ${status}`);
  }

  const targetEmp = await Employee.findById(leave.employeeId).lean();
  if (!targetEmp) {
    throw new AppError(404, 'Target employee not found');
  }

  const allowed = canApproveLeave(
    req.auth!.role,
    req.auth!.employeeId,
    targetEmp._id.toString(),
    targetEmp.reportingManagerId?.toString()
  );

  if (!allowed) {
    throw new AppError(403, 'Not authorized to approve or reject this leave request');
  }

  if (status === 'APPROVED') {
    const year = Number(leave.startDate.slice(0, 4));
    let balance = await LeaveBalance.findOne({ employeeId: leave.employeeId, year });
    if (!balance) {
      balance = await LeaveBalance.create({ employeeId: leave.employeeId, year });
    }

    const remaining = getRemainingBalance(balance, leave.leaveType);
    if (remaining < leave.totalDays) {
      throw new AppError(400, 'Employee no longer has sufficient leave balance');
    }

    if (leave.leaveType === 'CASUAL') balance.casualUsed += leave.totalDays;
    else if (leave.leaveType === 'SICK') balance.sickUsed += leave.totalDays;
    else if (leave.leaveType === 'EARNED') balance.earnedUsed += leave.totalDays;
    else if (leave.leaveType === 'UNPAID') balance.unpaidUsed += leave.totalDays;

    await balance.save();
  }

  leave.status = status;
  leave.reviewedBy = new mongoose.Types.ObjectId(req.auth!.userId);
  leave.reviewComment = reviewComment;
  leave.reviewedAt = new Date();
  await leave.save();

  const targetUser = await User.findOne({ employeeId: leave.employeeId }).select('_id').lean();
  if (targetUser) {
    await Notification.create({
      recipientUserId: targetUser._id,
      title: `Leave Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      message: `Your ${leave.leaveType.toLowerCase()} leave (${leave.startDate} to ${leave.endDate}) was ${status.toLowerCase()}.`,
      category: 'LEAVE',
      link: '/leave',
    });
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: `LEAVE_${status}`,
    resourceType: 'LeaveRequest',
    resourceId: id,
    summary: `${status} leave request for ${targetEmp.fullName}`,
    ipAddress: req.ip,
  });

  res.json({ leave });
}

export async function cancelLeaveRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid leave request ID');
  }

  const leave = await LeaveRequest.findById(id);
  if (!leave) {
    throw new AppError(404, 'Leave request not found');
  }

  const isOwner = req.auth!.employeeId && leave.employeeId.toString() === req.auth!.employeeId;
  if (!isOwner && !isHrOrAdmin(req.auth!.role)) {
    throw new AppError(403, 'Not authorized to cancel this leave request');
  }

  if (!canTransitionLeaveStatus(leave.status, 'CANCELLED')) {
    throw new AppError(400, 'Only pending leave requests can be cancelled');
  }

  leave.status = 'CANCELLED';
  await leave.save();

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'LEAVE_CANCELLED',
    resourceType: 'LeaveRequest',
    resourceId: id,
    summary: 'Cancelled pending leave request',
    ipAddress: req.ip,
  });

  res.json({ leave });
}
